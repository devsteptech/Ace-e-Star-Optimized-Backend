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

type ReportItem = {
  id: string;
  name: string;
  template: string;
  date: string;
  time: string;
};

type ReportMetrics = {
  totalGuests: number;
  checkedIn: number;     
  walkIns: number;
  noShows: number;
  avgCheckInMin: number;
  peakTime: string;
  timeline: { time: string; guests: number }[];
};

export async function listMyReports(req: Request, res: Response) {
  const eventId = req.user?.eventId;
  if (!eventId) return res.status(401).json({ message: "No eventId in token" });

  const ev: any = await Event.findById(eventId);
  if (!ev) return res.status(404).json({ message: "Event not found" });

  const tpl: any = ev.templateId ? await Template.findById(ev.templateId) : null;

  const item: ReportItem = {
    id: String(ev._id),
    name: ev.name || "Event",
    template: tpl?.eventType || ev.templateType || "Other",
    date: dateStr(ev.updatedAt || ev.createdAt || null),
    time: "Just now",
  };

  return res.json([item]);
}

export async function getMyReport(req: Request, res: Response) {
  const tokenEventId = req.user?.eventId;
  if (!tokenEventId) return res.status(401).json({ message: "No eventId in token" });

  const eventId = String(req.params.eventId || tokenEventId);

  if (eventId !== String(tokenEventId)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const ev: any = await Event.findById(eventId);
  if (!ev) return res.status(404).json({ message: "Event not found" });

  const tpl: any = ev.templateId ? await Template.findById(ev.templateId) : null;

  const guests: any[] = await Guest.find({ eventId }).sort({ createdAt: 1 });

  const totalGuests = guests.length;

  const attended = guests.filter((g) => !!g.checkedInAt || g.status === "Checked In" || g.status === "Checked Out");
  const checkedIn = attended.length;

  const walkIns = guests.filter((g) => g.type === "Walk-in").length;
  const noShows = Math.max(0, totalGuests - checkedIn);

  const attendance = attended
    .slice()
    .sort((a, b) => {
      const ta = a.checkedInAt ? new Date(a.checkedInAt).getTime() : 0;
      const tb = b.checkedInAt ? new Date(b.checkedInAt).getTime() : 0;
      return ta - tb;
    })
    .map((g) => ({
      id: String(g._id),
      name: g.name,
      relation: g.relation,
      checkInTime: timeStr(g.checkedInAt || null),
      type: g.type,
      status: g.status,
    }));

  const checkins = attended
    .filter((g) => !!g.checkedInAt)
    .map((g) => new Date(g.checkedInAt))
    .sort((a, b) => a.getTime() - b.getTime());

  let timeline: { time: string; guests: number }[] = [];
  let peakTime = "-";
  let avgCheckInMin = 0;

  if (checkins.length) {
    const startBase = floorToBucket(checkins[0], 15);
    const endBase = floorToBucket(checkins[checkins.length - 1], 15);

    const map = new Map<number, number>();
    for (const d of checkins) {
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

    const sumMin = checkins.reduce((sum, d) => sum + minutesBetween(d, checkins[0]), 0);
    avgCheckInMin = Number((sumMin / Math.max(1, checkins.length)).toFixed(1));
  } else {
    timeline = [{ time: "-", guests: 0 }];
    peakTime = "-";
    avgCheckInMin = 0;
  }

  const report: ReportItem = {
    id: String(ev._id),
    name: ev.name || "Event",
    template: tpl?.eventType || ev.templateType || "Other",
    date: dateStr(ev.updatedAt || ev.createdAt || null),
    time: "Just now",
  };

  const metrics: ReportMetrics = {
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