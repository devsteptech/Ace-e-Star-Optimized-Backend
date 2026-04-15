import { Router } from "express";
import { eventmanLogin, getMyEventConfig, eventmanLogout } from "../controllers/eventman.controller";
import { authEventMan } from "../middlewares/eventmanAuth"; 

const router = Router();

router.post("/login", eventmanLogin);

router.get("/config", authEventMan, getMyEventConfig);

router.post("/logout", authEventMan, eventmanLogout);

export default router;