import { Schema, model, type InferSchemaType } from "mongoose";

const eventSchema = new Schema(
    {
        templateId: { type: Schema.Types.ObjectId, ref: "Template", required: true },
        templateType: { type: String, required: true }, 

        name: { type: String, required: true },
        eventDate: { type: String, default: "" }, 
        venue: { type: String, default: "" },
        description: { type: String, default: "" },
        expectedGuests: { type: String, default: "" },
        logoUrl: { type: String, default: "" },

        status: { type: String, enum: ["On Going", "Completed"], default: "On Going" },

        endTime: { type: String, default: "-" },

        endedAt: { type: Date, default: null },

        eventManagerEmail: { type: String, required: true }
    },
    { timestamps: true }
);

export type EventDoc = InferSchemaType<typeof eventSchema>;
export default model<EventDoc>("Event", eventSchema);