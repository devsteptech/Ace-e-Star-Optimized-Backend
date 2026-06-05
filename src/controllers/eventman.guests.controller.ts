import type { Request, Response } from "express";
import Guest from "../models/Guest";
import Event from "../models/Event";
import Template from "../models/Template";

function key(s: string) {
    return (s || "").trim().toLowerCase();
}

function norm(s: any) {
    return String(s ?? "").trim().toLowerCase();
}

function timeStr(d: Date | null) {
    if (!d) return "-";
    return d.toLocaleTimeString("en-US", {
        timeZone: "America/Chicago",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
}

function isNameField(f: any) {
    const c = [f?.id, f?.fieldName, f?.label].map(norm);
    return c.includes("name") || c.some((x) => x === "your name" || x.includes("name"));
}

function isRelationField(f: any) {
    const c = [f?.id, f?.fieldName, f?.label].map(norm);
    return c.includes("relation") || c.some((x) => x.includes("relation"));
}

async function getGuestFieldsForEvent(eventId: string) {
    const ev: any = await Event.findById(eventId);
    if (!ev) return { ok: false as const, message: "Event not found" };

    const tpl: any = await Template.findById(ev.templateId);
    if (!tpl) return { ok: false as const, message: "Template not found" };

    const guestFields =
        Array.isArray(tpl.guestFields) && tpl.guestFields.length
            ? tpl.guestFields
            : [
                  { id: "name", label: "Name", fieldName: "name" },
                  { id: "relation", label: "Relation", fieldName: "relation" },
              ];

    return { ok: true as const, ev, tpl, guestFields };
}

function pickNameRelationFromBody(body: any, guestFields: any[]) {
    const fieldsObj = body?.fields && typeof body.fields === "object" ? body.fields : {};

    const nameField = guestFields.find(isNameField) ?? { fieldName: "name" };
    const relField = guestFields.find(isRelationField) ?? { fieldName: "relation" };

    const name =
        String(body?.name ?? fieldsObj?.[nameField.fieldName] ?? fieldsObj?.name ?? "").trim();
    const relation =
        String(body?.relation ?? fieldsObj?.[relField.fieldName] ?? fieldsObj?.relation ?? "").trim();

    return { name, relation, fieldsObj };
}

function sanitizeDotKey(k: string) {
    return k.replace(/\./g, "_").replace(/^\$/g, "");
}

function buildExtraMatchQuery(guestFields: any[], fieldsObj: Record<string, any>) {
    const extras = guestFields.filter((f) => !isNameField(f) && !isRelationField(f));

    const q: Record<string, any> = {};
    const missing: string[] = [];

    for (const f of extras) {
        const fieldName = String(f.fieldName || f.id || "").trim();
        if (!fieldName) continue;

        const safeFieldName = sanitizeDotKey(fieldName);
        const val = String(fieldsObj?.[fieldName] ?? "").trim();

        if (!val) {
            missing.push(f.label || fieldName);
            continue;
        }

        q[`extraKeys.${safeFieldName}`] = key(val);
    }

    return { q, missing };
}

function extractAndSaveExtra(fieldsObj: Record<string, any>) {
    const extra: Record<string, string> = {};
    const extraKeys: Record<string, string> = {};

    for (const [k, v] of Object.entries(fieldsObj || {})) {
        const kk = String(k || "").trim();
        if (!kk) continue;
        if (norm(kk) === "name" || norm(kk) === "relation") continue;

        const safeKey = sanitizeDotKey(kk);
        const val = String(v ?? "").trim();

        extra[safeKey] = val;
        extraKeys[safeKey] = key(val);
    }

    return { extra, extraKeys };
}

export async function listMyGuests(req: Request, res: Response) {
    const eventId = req.user?.eventId;
    if (!eventId) return res.status(401).json({ message: "No eventId in token" });

    const docs: any[] = await Guest.find({ eventId }).sort({ createdAt: -1 });

    return res.json(
        docs.map((g) => ({
            id: String(g._id),
            name: g.name,
            relation: g.relation,
            fields: g.extra ?? {}, 
            status: g.status,
            checkInTime: timeStr(g.checkedInAt),
            type: g.type,
        }))
    );
}

export async function checkIn(req: Request, res: Response) {
    const eventId = req.user?.eventId;
    if (!eventId) return res.status(401).json({ message: "No eventId" });

    const cfg = await getGuestFieldsForEvent(String(eventId));
    if (!cfg.ok) return res.status(404).json({ message: cfg.message });

    const { guestFields } = cfg;

    const { name, relation, fieldsObj } = pickNameRelationFromBody(req.body ?? {}, guestFields);

    if (!name || !relation) {
        return res.status(400).json({ message: "name and relation required" });
    }

    const { q: extraMatch, missing } = buildExtraMatchQuery(guestFields, fieldsObj);

    if (missing.length) {
        return res.status(400).json({
            message: `Missing required fields: ${missing.join(", ")}`,
        });
    }

    const findQuery: any = {
        eventId,
        nameKey: key(name),
        relationKey: key(relation),
        ...extraMatch,
    };

    const g: any = await Guest.findOne(findQuery);
    if (!g) {
        return res.status(404).json({
            message: "Guest not found. Please ensure all fields match the imported guest record.",
        });
    }

    if (g.status === "Checked In") return res.status(400).json({ message: "Guest already checked in" });
    if (g.status === "Checked Out") return res.status(400).json({ message: "Guest already checked out" });

    const { extra, extraKeys } = extractAndSaveExtra(fieldsObj);
    g.extra = { ...(g.extra ?? {}), ...extra };
    g.extraKeys = { ...(g.extraKeys ?? {}), ...extraKeys };

    const feedback = (req.body ?? {})?.feedback;
    const cleaned = Array.isArray(feedback)
        ? feedback
              .map((x: any) => ({
                  label: String(x?.label ?? "").trim(),
                  value: String(x?.value ?? "").trim(),
              }))
              .filter((x: any) => x.label.length > 0 && x.value.length > 0)
        : [];
    if (cleaned.length) g.feedback = cleaned;

    g.status = "Checked In";
    g.checkedInAt = new Date();
    g.checkedOutAt = null;
    await g.save();

    return res.json({ message: "Checked in" });
}

export async function checkOut(req: Request, res: Response) {
    const eventId = req.user?.eventId;
    if (!eventId) return res.status(401).json({ message: "No eventId" });

    const cfg = await getGuestFieldsForEvent(String(eventId));
    if (!cfg.ok) return res.status(404).json({ message: cfg.message });

    const { ev, tpl, guestFields } = cfg;

    if (!tpl?.enableCheckoutTag) {
        return res.status(400).json({ message: "Checkout is disabled for this event" });
    }

    const { name, relation, fieldsObj } = pickNameRelationFromBody(req.body ?? {}, guestFields);
    if (!name || !relation) return res.status(400).json({ message: "name and relation required" });

    const { q: extraMatch, missing } = buildExtraMatchQuery(guestFields, fieldsObj);
    if (missing.length) {
        return res.status(400).json({
            message: `Missing required fields: ${missing.join(", ")}`,
        });
    }

    const g: any = await Guest.findOne({
        eventId,
        nameKey: key(name),
        relationKey: key(relation),
        ...extraMatch,
    });

    if (!g) {
        return res.status(404).json({
            message: "Guest not found. Please ensure all fields match the guest record.",
        });
    }

    if (g.status === "Checked Out") return res.status(400).json({ message: "Guest already checked out" });
    if (g.status !== "Checked In" || !g.checkedInAt) {
        return res.status(400).json({ message: "Guest must be checked in before checkout" });
    }

    g.status = "Checked Out";
    g.checkedOutAt = new Date();
    await g.save();

    return res.json({ message: "Checked out" });
}

export async function walkInCheckIn(req: Request, res: Response) {
    const eventId = req.user?.eventId;
    if (!eventId) return res.status(401).json({ message: "No eventId in token" });

    const cfg = await getGuestFieldsForEvent(String(eventId));
    if (!cfg.ok) return res.status(404).json({ message: cfg.message });

    const { guestFields } = cfg;

    const { name, relation, fieldsObj } = pickNameRelationFromBody(req.body ?? {}, guestFields);
    const action = (req.body ?? {})?.action as "checkin" | "checkout" | undefined;

    if (!name || !relation) {
        return res.status(400).json({ message: "name and relation are required" });
    }

    const now = new Date();

    const existing: any = await Guest.findOne({
        eventId,
        nameKey: key(name),
        relationKey: key(relation),
    });

    if (existing && existing.type !== "Walk-in") {
        return res.status(400).json({
            message: "Guest already exists. Please use normal Check-in instead of Walk-in.",
        });
    }

    if (action === "checkout") {
        if (!existing) return res.status(404).json({ message: "Guest not found. Please check-in first." });
        if (existing.status === "Checked Out") return res.status(400).json({ message: "Guest already checked out" });
        if (existing.status !== "Checked In" || !existing.checkedInAt) {
            return res.status(400).json({ message: "Guest must be checked in before checkout" });
        }

        existing.status = "Checked Out";
        existing.checkedOutAt = now;
        await existing.save();

        return res.json({
            guest: {
                id: String(existing._id),
                name: existing.name,
                relation: existing.relation,
                fields: existing.extra ?? {},
                status: existing.status,
                checkInTime: timeStr(existing.checkedInAt),
                type: existing.type,
            },
        });
    }

    const { missing } = buildExtraMatchQuery(guestFields, fieldsObj);
    if (missing.length) {
        return res.status(400).json({
            message: `Missing required fields: ${missing.join(", ")}`,
        });
    }

    const feedback = (req.body ?? {})?.feedback;
    const cleaned = Array.isArray(feedback)
        ? feedback
              .map((x: any) => ({
                  label: String(x?.label ?? "").trim(),
                  value: String(x?.value ?? "").trim(),
              }))
              .filter((x: any) => x.label.length > 0 && x.value.length > 0)
        : [];

    let g: any = existing;

    if (!g) {
        const { extra, extraKeys } = extractAndSaveExtra(fieldsObj);

        g = await Guest.create({
            eventId,
            name: name.trim(),
            relation: relation.trim(),
            nameKey: key(name),
            relationKey: key(relation),
            type: "Walk-in",
            status: "Pending",
            checkedInAt: null,
            checkedOutAt: null,
            feedback: cleaned,
            extra,
            extraKeys,
        });
    }

    if (g.status === "Checked In") return res.status(400).json({ message: "Guest already checked in" });
    if (g.status === "Checked Out") return res.status(400).json({ message: "Guest already checked out" });

    if (cleaned.length) g.feedback = cleaned;

    const { extra, extraKeys } = extractAndSaveExtra(fieldsObj);
    g.extra = { ...(g.extra ?? {}), ...extra };
    g.extraKeys = { ...(g.extraKeys ?? {}), ...extraKeys };

    g.status = "Checked In";
    g.checkedInAt = now;
    g.checkedOutAt = null;
    await g.save();

    return res.json({
        guest: {
            id: String(g._id),
            name: g.name,
            relation: g.relation,
            fields: g.extra ?? {},
            status: g.status,
            checkInTime: timeStr(g.checkedInAt),
            type: g.type,
        },
    });
}

export async function editGuest(req: Request, res: Response) {
    const eventId = req.user?.eventId;
    const { name, relation } = (req.body ?? {}) as { name?: string; relation?: string };

    if (!eventId) return res.status(401).json({ message: "No eventId" });

    const g: any = await Guest.findOne({ _id: req.params.id, eventId });
    if (!g) return res.status(404).json({ message: "Guest not found" });

    if (name) {
        g.name = name.trim();
        g.nameKey = key(name);
    }
    if (relation) {
        g.relation = relation.trim();
        g.relationKey = key(relation);
    }

    await g.save();
    return res.json({ message: "Updated" });
}

export async function deleteGuest(req: Request, res: Response) {
    const eventId = req.user?.eventId;
    if (!eventId) return res.status(401).json({ message: "No eventId" });

    const g = await Guest.findOneAndDelete({ _id: req.params.id, eventId });
    if (!g) return res.status(404).json({ message: "Guest not found" });

    return res.json({ message: "Deleted" });
}