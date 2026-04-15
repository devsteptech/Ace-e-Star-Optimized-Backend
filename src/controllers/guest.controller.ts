import type { Request, Response } from "express";
import fs from "fs";
import XLSX from "xlsx";
import Event from "../models/Event";
import Guest from "../models/Guest";
import Template from "../models/Template";

function key(s: string) {
    return (s || "").trim().toLowerCase();
}

function pick(row: any, name: string) {
    const target = name.toLowerCase();
    for (const k of Object.keys(row)) {
        if (k.toLowerCase() === target) return row[k];
    }
    return "";
}

function safeKeyName(s: string) {
    return String(s || "").trim().replace(/\./g, "_").replace(/\$/g, "_");
}

export async function importGuests(req: Request, res: Response) {
    const eventId = req.params.id;
    const file = req.file;

    if (!file) return res.status(400).json({ message: "guest file is required" });

    const ev: any = await Event.findById(eventId);
    if (!ev) return res.status(404).json({ message: "Event not found" });

    const tpl: any = await Template.findById(ev.templateId);
    const guestFields = (tpl?.guestFields?.length ? tpl.guestFields : [
        { id: "name", label: "Name", fieldName: "name" },
        { id: "relation", label: "Relation", fieldName: "relation" },
    ]);

    try {
        const wb = XLSX.readFile(file.path);
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });

        const docs = rows
            .map((r) => {
                const extra: Record<string, string> = {};
                const extraKeys: Record<string, string> = {};

                for (const f of guestFields) {
                    const v =
                        String(pick(r, f.fieldName)).trim() ||
                        String(pick(r, f.label)).trim();

                    if (!v) return null;

                    if (f.id !== "name" && f.id !== "relation") {
                        extra[f.fieldName] = v;
                        extraKeys[f.fieldName] = key(v);
                    }
                }

                const name = String(pick(r, "name")).trim() || String(pick(r, "Name")).trim();
                const relation = String(pick(r, "relation")).trim() || String(pick(r, "Relation")).trim();

                if (!name || !relation) return null;

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
                    checkedOutAt: null
                };
            })
            .filter(Boolean) as any[];

        if (!docs.length) {
            return res.status(400).json({
                message: `No valid rows found. Required columns: ${guestFields.map((f: any) => f.fieldName).join(", ")}`
            });
        }

        await Guest.insertMany(docs, { ordered: false });
        return res.json({ message: "Guests imported", inserted: docs.length });
    } catch (e: any) {
        return res.status(500).json({ message: e?.message || "Import failed" });
    } finally {
        try { fs.unlinkSync(file.path); } catch { }
    }
}