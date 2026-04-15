import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import EventManager from "../models/EventManager";
import Event from "../models/Event";
import Template from "../models/Template";
import { revokeToken } from "../utils/revokedTokens";

export async function eventmanLogin(req: Request, res: Response) {
    const { email, password } = (req.body ?? {}) as { email?: string; password?: string };

    if (!email || !password) {
        return res.status(400).json({ message: "email and password are required" });
    }

    const mgr: any = await EventManager.findOne({ email });
    if (!mgr) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, mgr.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const ev: any = await Event.findById(mgr.eventId);
    if (!ev) return res.status(404).json({ message: "Event not found" });

    if (ev.status === "Completed") {
        return res.status(400).json({ message: "Event has ended" });
    }

    const token = jwt.sign(
        {
            id: String(mgr._id),
            role: "eventman",
            email: mgr.email,
            eventId: String(mgr.eventId),
        },
        process.env.JWT_SECRET as string,
        { expiresIn: "7d" }
    );

    return res.json({
        token,
        user: {
            email: mgr.email,
            role: "eventman",
            eventId: String(mgr.eventId),
            eventName: ev?.name ?? "",
        },
    });
}

export async function getMyEventConfig(req: Request, res: Response) {
    const eventId = req.user?.eventId;
    if (!eventId) return res.status(401).json({ message: "No eventId in token" });

    const ev: any = await Event.findById(eventId);
    if (!ev) return res.status(404).json({ message: "Event not found" });

    const template: any = await Template.findById(ev.templateId);
    if (!template) return res.status(404).json({ message: "Template not found" });

    return res.json({
        event: {
            id: String(ev._id),
            name: ev.name,
            logoUrl: ev.logoUrl || "",
            templateId: String(ev.templateId),
            templateType: ev.templateType,
        },
        template: {
            templateName: template.templateName,
            eventType: template.eventType,
            enableCheckoutTag: !!template.enableCheckoutTag,
            guestFields: template.guestFields ?? [],
            screen: template.screen ?? {},
            checkInTag: template.checkInTag ?? {},
            checkOutTag: template.checkOutTag ?? {},
            checkOutTagText: template.checkOutTagText ?? "",
        },
    });
}

export async function eventmanLogout(req: Request, res: Response) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "No token" });

    const decoded: any = jwt.decode(token);
    const expMs = decoded?.exp ? decoded.exp * 1000 : Date.now() + 7 * 24 * 60 * 60 * 1000;

    revokeToken(token, expMs);

    return res.json({ message: "Logged out" });
}