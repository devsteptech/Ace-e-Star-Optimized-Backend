import { Router } from "express";
import { authAdmin } from "../middlewares/auth";
import multer from "multer";
import path from "path";
import fs from "fs";
import { importGuests } from "../controllers/guest.controller";

const router = Router();

const TMP_DIR = path.join(process.cwd(), "tmp");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const upload = multer({ dest: TMP_DIR });

router.post("/events/:id/guests/import", authAdmin, upload.single("file"), importGuests);

export default router;