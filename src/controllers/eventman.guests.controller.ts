import type { Request, Response } from "express";
import Guest from "../models/Guest";
import Event from "../models/Event";
import Template from "../models/Template";

function key(s: string) {
    return (s || "").trim().toLowerCase();
}

function timeStr(d: Date | null) {
    if (!d) return "-";
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
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
            status: g.status,
            checkInTime: timeStr(g.checkedInAt),
            type: g.type,
        }))
    );
}

export async function checkIn(req: Request, res: Response) {
    const eventId = req.user?.eventId;
    const { name, relation } = (req.body ?? {}) as { name?: string; relation?: string };

    if (!eventId) return res.status(401).json({ message: "No eventId" });
    if (!name || !relation) return res.status(400).json({ message: "name and relation required" });

    const g: any = await Guest.findOne({ eventId, nameKey: key(name), relationKey: key(relation) });
    if (!g) return res.status(404).json({ message: "Guest not found. Please use Walk-in." });

    if (g.status === "Checked In") {
        return res.status(400).json({ message: "Guest already checked in" });
    }

    if (g.status === "Checked Out") {
        return res.status(400).json({ message: "Guest already checked out" });
    }

    g.status = "Checked In";
    g.checkedInAt = new Date();
    g.checkedOutAt = null;
    await g.save();

    return res.json({ message: "Checked in" });
}

export async function checkOut(req: Request, res: Response) {
    const eventId = req.user?.eventId;
    const { name, relation } = (req.body ?? {}) as { name?: string; relation?: string };

    if (!eventId) return res.status(401).json({ message: "No eventId" });
    if (!name || !relation) return res.status(400).json({ message: "name and relation required" });

    const ev: any = await Event.findById(eventId);
    if (!ev) return res.status(404).json({ message: "Event not found" });

    const tpl: any = await Template.findById(ev.templateId);
    if (!tpl?.enableCheckoutTag) {
        return res.status(400).json({ message: "Checkout is disabled for this event" });
    }

    const g: any = await Guest.findOne({ eventId, nameKey: key(name), relationKey: key(relation) });
    if (!g) return res.status(404).json({ message: "Guest not found. Please use Walk-in." });

    if (g.status === "Checked Out") {
        return res.status(400).json({ message: "Guest already checked out" });
    }

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

    const { name, relation, action } = (req.body ?? {}) as {
        name?: string;
        relation?: string;
        action?: "checkin" | "checkout";
    };

    if (!name?.trim() || !relation?.trim()) {
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
        if (!existing) {
            return res.status(404).json({ message: "Guest not found. Please check-in first." });
        }

        if (existing.status === "Checked Out") {
            return res.status(400).json({ message: "Guest already checked out" });
        }

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
                status: existing.status,
                checkInTime: timeStr(existing.checkedInAt),
                type: existing.type,
            },
        });
    }

    let g: any = existing;

    if (!g) {
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
        });
    }

    if (g.status === "Checked In") {
        return res.status(400).json({ message: "Guest already checked in" });
    }

    if (g.status === "Checked Out") {
        return res.status(400).json({ message: "Guest already checked out" });
    }

    g.status = "Checked In";
    g.checkedInAt = now;
    g.checkedOutAt = null;
    await g.save();

    return res.json({
        guest: {
            id: String(g._id),
            name: g.name,
            relation: g.relation,
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