import { Router } from "express";
import { authAdmin } from "../middlewares/auth";
import { getAdminDashboard } from "../controllers/admin.dashboard.controller";

const router = Router();
router.use(authAdmin);

router.get("/dashboard", getAdminDashboard);

export default router;