import type { Request, Response } from "express";
import Guest from "../models/Guest";
import Event from "../models/Event";

function timeStr(d: Date | null) {
    if (!d) return "-";
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function toInt(v: any) {
    const n = parseInt(String(v || "").replace(/[^\d]/g, ""), 10);
    return Number.isFinite(n) ? n : 0;
}

export async function getAdminDashboard(req: Request, res: Response) {
    const activeEvents: any[] = await Event.find({ status: "On Going" })
        .select("_id name venue eventDate expectedGuests")
        .lean();

    const activeEventsCount = activeEvents.length;

    if (!activeEventsCount) {
        return res.json({
            event: null,
            checkedIn: 0,
            expected: 0,
            attendance: 0,
            activeEvents: 0,
            totalGuests: 0,
            guests: [],
        });
    }

    const activeIds = activeEvents.map((e) => e._id);

    const top = await Guest.aggregate([
        { $match: { eventId: { $in: activeIds } } },
        { $group: { _id: "$eventId", total: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 1 },
    ]);

    const topEventId = top?.[0]?._id ? String(top[0]._id) : String(activeEvents[0]._id);
    const ev = activeEvents.find((x) => String(x._id) === topEventId) || activeEvents[0];

    const eventTotalGuests =
        typeof top?.[0]?.total === "number" && String(top?.[0]?._id) === String(ev._id)
            ? top[0].total
            : await Guest.countDocuments({ eventId: ev._id });

    const checkedIn = await Guest.countDocuments({
        eventId: ev._id,
        status: { $in: ["Checked In", "Checked Out"] },
    });

    const expected = toInt(ev.expectedGuests);
    const attendance = expected > 0 ? Math.min(100, Math.round((checkedIn / expected) * 100)) : 0;

    const recent = await Guest.find({
        eventId: ev._id,
        checkedInAt: { $ne: null },
    })
        .sort({ checkedInAt: -1 })
        .limit(8)
        .select("name status checkedInAt")
        .lean();

    const guests = recent.map((g: any) => ({
        name: g.name,
        status: g.status,
        checkInTime: timeStr(g.checkedInAt || null),
    }));

    return res.json({
        event: {
            id: String(ev._id),
            name: ev.name || "Event",
            venue: ev.venue || "",
            eventDate: ev.eventDate || "",
        },
        checkedIn,
        expected,
        attendance,
        activeEvents: activeEventsCount,
        totalGuests: eventTotalGuests,
        guests,
    });
}