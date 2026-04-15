import { Router } from "express";
import { authEventMan } from "../middlewares/eventmanAuth";
import {
    listMyGuests,
    checkIn,
    checkOut,
    walkInCheckIn,
    editGuest,
    deleteGuest
} from "../controllers/eventman.guests.controller";

const router = Router();
router.use(authEventMan);

router.get("/guests", listMyGuests);
router.post("/checkin", checkIn);
router.post("/checkout", checkOut);
router.post("/walkin", walkInCheckIn);
router.put("/guests/:id", editGuest);
router.delete("/guests/:id", deleteGuest);

export default router;