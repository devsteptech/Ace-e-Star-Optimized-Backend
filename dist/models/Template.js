"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const guestFieldSchema = new mongoose_1.Schema({
    id: { type: String, required: true }, 
    label: { type: String, default: "" },
    fieldName: { type: String, default: "" }
}, { _id: false });
const screenSchema = new mongoose_1.Schema({
    headerBgUrl: { type: String, default: "" },
    bodyBgUrl: { type: String, default: "" },
    logoUrl: { type: String, default: "" }
}, { _id: false });
const tagSchema = new mongoose_1.Schema({
    size: { type: String, enum: ["8x2", "6x2", "4x2"], default: "8x2" },
    bgUrl: { type: String, default: "" },
    logoUrl: { type: String, default: "" }
}, { _id: false });
const templateSchema = new mongoose_1.Schema({
    templateName: { type: String, required: true },
    eventType: { type: String, required: true, enum: ["Wedding", "Birthday", "Corporate", "Other"] },
    guestFields: { type: [guestFieldSchema], default: [] },
    enableCheckoutTag: { type: Boolean, default: false },
    screen: { type: screenSchema, default: () => ({}) },
    checkInTag: { type: tagSchema, default: () => ({}) },
    checkOutTag: { type: tagSchema, default: () => ({}) },
    thumbnailUrl: { type: String, default: "" },
    screenBgUrl: { type: String, default: "" },
    screenLogoUrl: { type: String, default: "" },
    checkInTagSize: { type: String, enum: ["8x2", "6x2", "4x2"], default: "8x2" },
    checkInBgUrl: { type: String, default: "" },
    checkInLogoUrl: { type: String, default: "" },
    checkOutTagSize: { type: String, enum: ["8x2", "6x2", "4x2"], default: "8x2" },
    checkOutBgUrl: { type: String, default: "" },
    checkOutLogoUrl: { type: String, default: "" },
    checkOutTagText: { type: String, default: "" },
    usedTimes: { type: Number, default: 0 }
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("Template", templateSchema);
