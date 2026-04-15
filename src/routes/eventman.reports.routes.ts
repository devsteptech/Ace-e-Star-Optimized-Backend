import { Router } from "express";
import { authEventMan } from "../middlewares/eventmanAuth";
import { listMyReports, getMyReport } from "../controllers/eventman.reports.controller";

const router = Router();
router.use(authEventMan);

router.get("/reports", listMyReports);
router.get("/reports/:eventId", getMyReport);

export default router;