import type { Request, Response } from "express";
import Guest from "../models/Guest";
import Event from "../models/Event";
import Template from "../models/Template";

function timeStr(d: Date | null) {
    if (!d) return "-";
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function dateStr(d: Date | null) {
    if (!d) return "-";
    return d.toLocaleDateString("en-US");
}

function floorToBucket(d: Date, bucketMin = 15) {
    const ms = bucketMin * 60 * 1000;
    return new Date(Math.floor(d.getTime() / ms) * ms);
}

function minutesBetween(a: Date, b: Date) {
    return Math.max(0, (a.getTime() - b.getTime()) / 60000);
}

export async function getReportDetail(req: Request, res: Response) {
    const eventId = String(req.params.eventId || "");
    if (!eventId) return res.status(400).json({ message: "eventId required" });

    const ev: any = await Event.findById(eventId);
    if (!ev) return res.status(404).json({ message: "Event not found" });

    const tpl: any = ev.templateId ? await Template.findById(ev.templateId) : null;

    const guests: any[] = await Guest.find({ eventId }).sort({ createdAt: 1 });

    const totalGuests = guests.length;

    const attended = guests.filter(
        (g) => !!g.checkedInAt || g.status === "Checked In" || g.status === "Checked Out"
    );

    const checkedIn = attended.length;
    const walkIns = guests.filter((g) => g.type === "Walk-in").length;
    const noShows = Math.max(0, totalGuests - checkedIn);

    const attendance = attended
        .filter((g) => !!g.checkedInAt)
        .sort((a, b) => new Date(a.checkedInAt).getTime() - new Date(b.checkedInAt).getTime())
        .map((g) => ({
            id: String(g._id),
            name: g.name,
            relation: g.relation,
            checkInTime: timeStr(g.checkedInAt || null),
            type: g.type,
            status: g.status,
        }));

    const checkinDates = attended
        .filter((g) => !!g.checkedInAt)
        .map((g) => new Date(g.checkedInAt))
        .sort((a, b) => a.getTime() - b.getTime());

    let timeline: { time: string; guests: number }[] = [];
    let peakTime = "-";
    let avgCheckInMin = 0;

    if (checkinDates.length) {
        const startBase = floorToBucket(checkinDates[0], 15);
        const endBase = floorToBucket(checkinDates[checkinDates.length - 1], 15);

        const map = new Map<number, number>();
        for (const d of checkinDates) {
            const b = floorToBucket(d, 15).getTime();
            map.set(b, (map.get(b) || 0) + 1);
        }

        const cur = new Date(startBase);
        const endMs = endBase.getTime();

        while (cur.getTime() <= endMs) {
            const ms = cur.getTime();
            timeline.push({
                time: cur.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
                guests: map.get(ms) || 0,
            });
            cur.setMinutes(cur.getMinutes() + 15);
        }

        const peak = timeline.reduce((a, b) => (b.guests > a.guests ? b : a), timeline[0]);
        peakTime = peak?.time || "-";

        const sumMin = checkinDates.reduce((sum, d) => sum + minutesBetween(d, checkinDates[0]), 0);
        avgCheckInMin = Number((sumMin / Math.max(1, checkinDates.length)).toFixed(1));
    } else {
        timeline = [{ time: "-", guests: 0 }];
        peakTime = "-";
        avgCheckInMin = 0;
    }

    const report = {
        id: String(ev._id),
        name: ev.name || "Event",
        template: tpl?.eventType || ev.templateType || "Other",
        date: dateStr(ev.updatedAt || ev.createdAt || null),
        time: String(ev.endTime || ev.startTime || "-"),
    };

    const metrics = {
        totalGuests,
        checkedIn,
        walkIns,
        noShows,
        avgCheckInMin,
        peakTime,
        timeline,
    };

    return res.json({ report, metrics, attendance });
}