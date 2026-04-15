import { Router } from "express";
import { adminLogin, me, adminLogout } from "../controllers/auth.controller";
import { authAdmin } from "../middlewares/auth";

const router = Router();

router.post("/admin/login", adminLogin);
router.get("/me", authAdmin, me);

router.post("/admin/logout", authAdmin, adminLogout);

export default router;