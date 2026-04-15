import { Schema, model, type InferSchemaType } from "mongoose";

const guestSchema = new Schema(
    {
        eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },

        name: { type: String, required: true },
        relation: { type: String, required: true },

        nameKey: { type: String, required: true, index: true },
        relationKey: { type: String, required: true, index: true },

        extra: { type: Schema.Types.Mixed, default: {} },
        extraKeys: { type: Schema.Types.Mixed, default: {} },

        status: { type: String, enum: ["Pending", "Checked In", "Checked Out"], default: "Pending" },
        type: { type: String, enum: ["Pre-registered", "Walk-in"], default: "Pre-registered" },

        checkedInAt: { type: Date, default: null },
        checkedOutAt: { type: Date, default: null }
    },
    { timestamps: true }
);

guestSchema.index({ eventId: 1, nameKey: 1, relationKey: 1, type: 1 }, { unique: true });

export type GuestDoc = InferSchemaType<typeof guestSchema>;
export default model<GuestDoc>("Guest", guestSchema);