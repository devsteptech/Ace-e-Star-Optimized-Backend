import { Router } from "express";
import { authAdmin } from "../middlewares/auth";
import {
    createTemplate,
    listTemplates,
    getTemplate,
    updateTemplate,
    deleteTemplate
} from "../controllers/template.controller";

const router = Router();
router.use(authAdmin);

router.get("/", listTemplates);
router.post("/", createTemplate);
router.get("/:id", getTemplate); 
router.put("/:id", updateTemplate); 
router.delete("/:id", deleteTemplate);

export default router;