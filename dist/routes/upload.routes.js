"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
const UPLOAD_DIR = path_1.default.join(process.cwd(), "uploads");

if (!fs_1.default.existsSync(UPLOAD_DIR)) {
    fs_1.default.mkdirSync(UPLOAD_DIR, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        const name = `${Date.now()}-${crypto_1.default.randomBytes(8).toString("hex")}${ext}`;
        cb(null, name);
    }
});
function fileFilter(_req, file, cb) {
    const ok = ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.mimetype);
    cb(ok ? null : new Error("Only images allowed (png/jpg/jpeg/webp)"), ok);
}
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});
router.use(auth_1.authAdmin);
router.post("/", upload.single("file"), (req, res) => {
    const file = req.file;
    if (!file)
        return res.status(400).json({ message: "file is required" });
    const url = `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
    return res.json({ url, filename: file.filename });
});
router.use((err, _req, res, _next) => {
    const msg = err?.message || "Upload error";
    return res.status(400).json({ message: msg });
});
exports.default = router;
