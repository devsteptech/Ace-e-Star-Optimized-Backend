import type { Request, Response } from "express";
import fs from "fs";
import XLSX from "xlsx";
import Event from "../models/Event";
import Guest from "../models/Guest";
import Template from "../models/Template";

function key(s: string) {
    return (s || "").trim().toLowerCase();
}

function norm(s: any) {
    return String(s ?? "").trim().toLowerCase();
}

function clean(s: any) {
    return String(s ?? "").trim();
}

function getHeaderRow(sheet: XLSX.WorkSheet): string[] {
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "" }) as any[];
    const header = Array.isArray(rows?.[0]) ? rows[0] : [];
    return header.map((x: any) => String(x ?? "").trim()).filter((x: string) => x.length > 0);
}

function buildHeaderMap(headers: string[], guestFields: any[]) {
    const headersNorm = headers.map((h) => norm(h));

    if (headers.length !== guestFields.length) {
        return { ok: false as const, message: `Invalid columns. Expected ${guestFields.length} columns.` };
    }

    const used = new Set<number>();
    const map: Record<string, string> = {};

    for (const f of guestFields) {
        const candidates = [norm(f.fieldName), norm(f.label), norm(f.id)].filter(Boolean);
        let idx = -1;

        for (let i = 0; i < headers.length; i++) {
            if (used.has(i)) continue;
            if (candidates.includes(headersNorm[i])) {
                idx = i;
                break;
            }
        }

        if (idx === -1) {
            return {
                ok: false as const,
                message: `Missing required column: ${String(f.fieldName || f.label || f.id)}`,
            };
        }

        used.add(idx);
        map[String(f.fieldName || f.id)] = headers[idx];
    }

    return { ok: true as const, map };
}

async function validateSheetAgainstTemplate(filePath: string, guestFields: any[]) {
    const wb = XLSX.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) return { ok: false as const, message: "Invalid file" };

    const headers = getHeaderRow(sheet);
    if (!headers.length) return { ok: false as const, message: "File header row is missing" };

    const headerMapRes = buildHeaderMap(headers, guestFields);
    if (!headerMapRes.ok) return headerMapRes;

    const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
    if (!rows.length) return { ok: false as const, message: "No rows found in file" };

    for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        for (const f of guestFields) {
            const k = String(f.fieldName || f.id);
            const hdr = headerMapRes.map[k];
            const v = clean(r?.[hdr]);
            if (!v) {
                return {
                    ok: false as const,
                    message: `Empty value at row ${i + 2} for column "${hdr}"`,
                };
            }
        }
    }

    return { ok: true as const, headerMap: headerMapRes.map, rows };
}

export async function validateGuestsFile(req: Request, res: Response) {
    const file = req.file;
    const templateId = String((req.body as any)?.templateId || "");

    if (!file) return res.status(400).json({ message: "guest file is required" });
    if (!templateId) {
        try { fs.unlinkSync(file.path); } catch { }
        return res.status(400).json({ message: "templateId is required" });
    }

    try {
        const tpl: any = await Template.findById(templateId);
        if (!tpl) return res.status(404).json({ message: "Template not found" });

        const guestFields =
            Array.isArray(tpl.guestFields) && tpl.guestFields.length
                ? tpl.guestFields
                : [
                    { id: "name", label: "Name", fieldName: "name" },
                    { id: "relation", label: "Relation", fieldName: "relation" },
                ];

        const v = await validateSheetAgainstTemplate(file.path, guestFields);
        if (!v.ok) return res.status(400).json({ message: v.message });

        return res.json({ ok: true });
    } catch (e: any) {
        return res.status(500).json({ message: e?.message || "Validate failed" });
    } finally {
        try { fs.unlinkSync(file.path); } catch { }
    }
}

export async function importGuests(req: Request, res: Response) {
    const eventId = req.params.id;
    const file = req.file;

    if (!file) return res.status(400).json({ message: "guest file is required" });

    const ev: any = await Event.findById(eventId);
    if (!ev) {
        try { fs.unlinkSync(file.path); } catch { }
        return res.status(404).json({ message: "Event not found" });
    }

    const tpl: any = await Template.findById(ev.templateId);
    const guestFields =
        Array.isArray(tpl?.guestFields) && tpl.guestFields.length
            ? tpl.guestFields
            : [
                { id: "name", label: "Name", fieldName: "name" },
                { id: "relation", label: "Relation", fieldName: "relation" },
            ];

    try {
        const v = await validateSheetAgainstTemplate(file.path, guestFields);
        if (!v.ok) return res.status(400).json({ message: v.message });

        const rows = (v as any).rows as any[];
        const headerMap = (v as any).headerMap as Record<string, string>;

        const nameField = guestFields.find((x: any) => String(x.id) === "name" || norm(x.fieldName) === "name");
        const relationField = guestFields.find((x: any) => String(x.id) === "relation" || norm(x.fieldName) === "relation");

        const nameHdr = headerMap[String(nameField?.fieldName || "name")];
        const relHdr = headerMap[String(relationField?.fieldName || "relation")];

        const docs = rows.map((r) => {
            const extra: Record<string, string> = {};
            const extraKeys: Record<string, string> = {};

            for (const f of guestFields) {
                const k = String(f.fieldName || f.id);
                const hdr = headerMap[k];
                const value = clean(r?.[hdr]);

                if (String(f.id) !== "name" && String(f.id) !== "relation") {
                    extra[String(f.fieldName || f.id)] = value;
                    extraKeys[String(f.fieldName || f.id)] = key(value);
                }
            }

            const name = clean(r?.[nameHdr]);
            const relation = clean(r?.[relHdr]);

            return {
                eventId: ev._id,
                name,
                relation,
                nameKey: key(name),
                relationKey: key(relation),
                extra,
                extraKeys,
                status: "Pending",
                type: "Pre-registered",
                checkedInAt: null,
                checkedOutAt: null,
            };
        });

        await Guest.insertMany(docs, { ordered: false });
        return res.json({ message: "Guests imported", inserted: docs.length });
    } catch (e: any) {
        return res.status(500).json({ message: e?.message || "Import failed" });
    } finally {
        try { fs.unlinkSync(file.path); } catch { }
    }
}