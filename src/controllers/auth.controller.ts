import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { revokeToken } from "../utils/revokedTokens";

export async function adminLogin(req: Request, res: Response) {
    const { email, password } = (req.body ?? {}) as { email?: string; password?: string };

    if (!email || !password) {
        return res.status(400).json({ message: "email and password are required" });
    }

    const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
        return res.status(500).json({ message: "Admin credentials not set in .env" });
    }

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
        return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
        { id: "admin", role: "admin", email: ADMIN_EMAIL },
        process.env.JWT_SECRET as string,
        { expiresIn: "7d" }
    );

    return res.json({
        token,
        user: { id: "admin", role: "admin", email: ADMIN_EMAIL }
    });
}

export async function me(req: Request, res: Response) {
    return res.json({ user: req.user });
}

export async function adminLogout(req: Request, res: Response) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) return res.status(401).json({ message: "No token" });

    const decoded: any = jwt.decode(token);
    const expMs =
        decoded?.exp ? decoded.exp * 1000 : Date.now() + 7 * 24 * 60 * 60 * 1000;

    revokeToken(token, expMs);

    return res.json({ message: "Logged out" });
}