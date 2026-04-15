import { Router, type Request, type Response, type NextFunction } from "express";
import { authAdmin } from "../middlewares/auth";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";

const router = Router();

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const name = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
        cb(null, name);
    }
});

function fileFilter(_req: any, file: any, cb: any) {
    const ok = ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.mimetype);
    cb(ok ? null : new Error("Only images allowed (png/jpg/jpeg/webp)"), ok);
}

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } 
});

router.use(authAdmin);

router.post(
    "/",
    upload.single("file"),
    (req: Request, res: Response) => {
        const file = req.file;
        if (!file) return res.status(400).json({ message: "file is required" });

        const url = `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;

        return res.json({ url, filename: file.filename });
    }
);

router.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const msg = err?.message || "Upload error";
    return res.status(400).json({ message: msg });
});

export default router;