import type { Request, Response } from "express";
import Template from "../models/Template";

type TemplateCard = {
    id: string;
    title: string;
    imageUrl: string;
    fieldsText: string;
    usedTimes: number;
    date: string;
};

function toCard(t: any): TemplateCard {
    return {
        id: String(t._id),
        title: t.templateName,

        imageUrl: t.thumbnailUrl || t.screen?.headerBgUrl || "/images/template-default.png",
        fieldsText: `${t.guestFields?.length || 0} fields`,
        usedTimes: t.usedTimes ?? 0,
        date: new Date(t.createdAt).toLocaleDateString()
    };
}

export async function createTemplate(req: Request, res: Response) {
    const b = req.body ?? {};

    if (!b.templateName || !b.eventType) {
        return res.status(400).json({ message: "templateName and eventType are required" });
    }

    const enableCheckoutTag = !!b.enableCheckoutTag;

    const doc = await Template.create({
        templateName: b.templateName,
        eventType: b.eventType,

        guestFields: Array.isArray(b.guestFields) ? b.guestFields : [],
        enableCheckoutTag,

        screen: b.screen ?? {},

        checkInTag: b.checkInTag ?? {},

        checkOutTag: enableCheckoutTag ? (b.checkOutTag ?? {}) : {},
        checkOutTagText: enableCheckoutTag ? (b.checkOutTagText ?? "") : "",

        thumbnailUrl: b.thumbnailUrl ?? ""
    });

    return res.json({ template: doc, card: toCard(doc) });
}

export async function listTemplates(_req: Request, res: Response) {
    const docs = await Template.find().sort({ createdAt: -1 });
    return res.json(docs.map(toCard));
}

export async function getTemplate(req: Request, res: Response) {
    const doc = await Template.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Template not found" });
    return res.json(doc);
}

export async function updateTemplate(req: Request, res: Response) {
    const b = req.body ?? {};

    const enableCheckoutTag =
        typeof b.enableCheckoutTag === "boolean" ? b.enableCheckoutTag : undefined;

    if (enableCheckoutTag === false) {
        b.checkOutTag = {};
        b.checkOutTagText = "";
    }

    const doc = await Template.findByIdAndUpdate(req.params.id, b, { new: true });
    if (!doc) return res.status(404).json({ message: "Template not found" });

    return res.json({ template: doc, card: toCard(doc) });
}

export async function deleteTemplate(req: Request, res: Response) {
    const doc = await Template.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Template not found" });
    return res.json({ message: "Deleted" });
}