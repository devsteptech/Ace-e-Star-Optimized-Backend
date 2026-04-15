import { Router } from "express";
import { authAdmin } from "../middlewares/auth";
import { createEvent, listEvents, getEventCredentials, endEvent } from "../controllers/event.controller";

const router = Router();
router.use(authAdmin);

router.get("/", listEvents);
router.post("/", createEvent);


router.get("/:id/credentials", getEventCredentials);
router.post("/:id/end", endEvent);

export default router;