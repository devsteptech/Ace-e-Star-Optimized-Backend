import type { Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcrypt";

import Template from "../models/Template";
import EventManager from "../models/EventManager";
import Event from "../models/Event";

import { sendEventManagerCredentials } from "../utils/mailer";
import { encryptText, decryptText } from "../utils/credCrypto";

function timeAgo(d: Date) {
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);

    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min ago`;

    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;

    const days = Math.floor(hrs / 24);
    return `${days} day ago`;
}

export async function listEvents(_req: Request, res: Response) {
    const docs: any[] = await Event.find().sort({ createdAt: -1 });

    const data = docs.map((e: any) => {
        const isCompleted = e.status === "Completed";


        const endBase: Date | null = isCompleted
            ? (e.endedAt || e.updatedAt || null)
            : null;

        return {
            id: String(e._id),
            name: e.name,
            template: e.templateType,
            startTime: timeAgo(new Date(e.createdAt)),
            status: e.status,
            endTime: isCompleted && endBase ? timeAgo(new Date(endBase)) : "-",

            logoUrl: e.logoUrl || "",
            eventManagerEmail: e.eventManagerEmail || ""
        };
    });

    return res.json(data);
}

export async function createEvent(req: Request, res: Response) {
    const b = req.body ?? {};

    const templateId = b.templateId as string | undefined;
    const eventName = b.eventName as string | undefined;
    const eventManagerEmail = b.eventManagerEmail as string | undefined;

    if (!templateId || !eventName || !eventManagerEmail) {
        return res.status(400).json({ message: "templateId, eventName, eventManagerEmail are required" });
    }

    const template: any = await Template.findById(templateId);
    if (!template) return res.status(404).json({ message: "Template not found" });

    const password = crypto.randomBytes(6).toString("base64url");
    const passwordHash = await bcrypt.hash(password, 10);
    const passwordEnc = encryptText(password);

    const ev: any = await Event.create({
        templateId: template._id,
        templateType: template.eventType,

        name: eventName,
        eventDate: b.eventDate ?? "",
        venue: b.venue ?? "",
        description: b.description ?? "",
        expectedGuests: b.expectedGuests ?? "",
        logoUrl: b.logoUrl ?? "",

        status: "On Going",
        endTime: "-",
        endedAt: null, 

        eventManagerEmail
    });

    await EventManager.findOneAndUpdate(
        { email: eventManagerEmail },
        { email: eventManagerEmail, passwordHash, passwordEnc, eventId: ev._id },
        { upsert: true, new: true }
    );

    await sendEventManagerCredentials({
        to: eventManagerEmail,
        eventName: ev.name,
        password
    });

    return res.json({ message: "Event created & email sent", eventId: String(ev._id) });
}

export async function getEventCredentials(req: Request, res: Response) {
    const eventId = req.params.id;

    const ev: any = await Event.findById(eventId);
    if (!ev) return res.status(404).json({ message: "Event not found" });

    const mgr: any = await EventManager.findOne({ eventId: ev._id });
    if (!mgr) return res.status(404).json({ message: "Event manager not found" });

    const password = decryptText(mgr.passwordEnc);

    return res.json({
        eventId: String(ev._id),
        eventName: ev.name,
        eventManagerEmail: mgr.email,
        password,
        logoUrl: ev.logoUrl || ""
    });
}

export async function endEvent(req: Request, res: Response) {
    const id = req.params.id;

    const ev: any = await Event.findByIdAndUpdate(
        id,
        {
            status: "Completed",
            endedAt: new Date(),  
            endTime: "-"          
        },
        { new: true }
    );

    if (!ev) return res.status(404).json({ message: "Event not found" });

    return res.json({
        id: String(ev._id),
        name: ev.name,
        template: ev.templateType,
        startTime: timeAgo(new Date(ev.createdAt)),
        status: ev.status,
        endTime: ev.endedAt ? timeAgo(new Date(ev.endedAt)) : "just now",
        logoUrl: ev.logoUrl || "",
        eventManagerEmail: ev.eventManagerEmail || ""
    });
}