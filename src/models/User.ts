import { Schema, model, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true, index: true },
        passwordHash: { type: String, required: true },
        role: { type: String, enum: ["admin", "user"], default: "user" }
    },
    { timestamps: true }
);

export type User = InferSchemaType<typeof userSchema>;
export default model<User>("User", userSchema);