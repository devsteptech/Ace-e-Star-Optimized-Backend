import type { JwtPayload } from "jsonwebtoken";

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload & {
                id: string;
                role: "admin" | "eventman";
                email: string;
                eventId?: string;
            };
        }
    }
}

export { };