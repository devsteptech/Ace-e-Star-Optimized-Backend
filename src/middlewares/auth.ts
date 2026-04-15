import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { isTokenRevoked } from "../utils/revokedTokens";

export function authAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ message: "No token" });

  if (isTokenRevoked(token)) {
    return res.status(401).json({ message: "Token revoked. Please login again." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as any;

    if (payload?.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}