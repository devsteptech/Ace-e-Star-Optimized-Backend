import { Router } from "express";
import jwt from "jsonwebtoken";
import { getReportDetail } from "../controllers/reports.controller";

const router = Router();

function authJwt(req: any, res: any, next: any) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "No token" });

    try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ message: "Invalid token" });
    }
}

router.use(authJwt);

router.get("/reports/:eventId", getReportDetail);

export default router;