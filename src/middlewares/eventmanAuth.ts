import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { isTokenRevoked } from "../utils/revokedTokens";
import Event from "../models/Event";

export async function authEventMan(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) return res.status(401).json({ message: "No token" });

    if (isTokenRevoked(token)) {
        return res.status(401).json({ message: "Token revoked. Please login again." });
    }

    let payload: any;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    } catch {
        return res.status(401).json({ message: "Invalid token" });
    }

    if (payload?.role !== "eventman") {
        return res.status(403).json({ message: "Forbidden" });
    }

    try {
        const ev: any = await Event.findById(payload.eventId).select("status");
        if (!ev) return res.status(401).json({ message: "Event not found" });

        if (ev.status === "Completed") {
            return res.status(401).json({ message: "Event ended. Please login again." });
        }
    } catch {
        return res.status(401).json({ message: "Invalid token" });
    }

    req.user = payload;
    next();
}