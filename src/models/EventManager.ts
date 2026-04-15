import { Schema, model, type InferSchemaType } from "mongoose";

const eventManagerSchema = new Schema(
    {
        email: { type: String, required: true, unique: true, index: true },
        passwordHash: { type: String, required: true },

        passwordEnc: { type: String, required: true },

        eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true }
    },
    { timestamps: true }
);

export type EventManagerDoc = InferSchemaType<typeof eventManagerSchema>;
export default model<EventManagerDoc>("EventManager", eventManagerSchema);