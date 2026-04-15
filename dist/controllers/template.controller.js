"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTemplate = createTemplate;
exports.listTemplates = listTemplates;
exports.getTemplate = getTemplate;
exports.updateTemplate = updateTemplate;
exports.deleteTemplate = deleteTemplate;
const Template_1 = __importDefault(require("../models/Template"));
function toCard(t) {
    return {
        id: String(t._id),
        title: t.templateName,

        imageUrl: t.thumbnailUrl || t.screen?.headerBgUrl || "/images/template-default.png",
        fieldsText: `${t.guestFields?.length || 0} fields`,
        usedTimes: t.usedTimes ?? 0,
        date: new Date(t.createdAt).toLocaleDateString()
    };
}
async function createTemplate(req, res) {
    const b = req.body ?? {};
    if (!b.templateName || !b.eventType) {
        return res.status(400).json({ message: "templateName and eventType are required" });
    }
    const enableCheckoutTag = !!b.enableCheckoutTag;
    const doc = await Template_1.default.create({
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
async function listTemplates(_req, res) {
    const docs = await Template_1.default.find().sort({ createdAt: -1 });
    return res.json(docs.map(toCard));
}
async function getTemplate(req, res) {
    const doc = await Template_1.default.findById(req.params.id);
    if (!doc)
        return res.status(404).json({ message: "Template not found" });
    return res.json(doc);
}
async function updateTemplate(req, res) {
    const b = req.body ?? {};
    const enableCheckoutTag = typeof b.enableCheckoutTag === "boolean" ? b.enableCheckoutTag : undefined;
    if (enableCheckoutTag === false) {
        b.checkOutTag = {};
        b.checkOutTagText = "";
    }
    const doc = await Template_1.default.findByIdAndUpdate(req.params.id, b, { new: true });
    if (!doc)
        return res.status(404).json({ message: "Template not found" });
    return res.json({ template: doc, card: toCard(doc) });
}
async function deleteTemplate(req, res) {
    const doc = await Template_1.default.findByIdAndDelete(req.params.id);
    if (!doc)
        return res.status(404).json({ message: "Template not found" });
    return res.json({ message: "Deleted" });
}
