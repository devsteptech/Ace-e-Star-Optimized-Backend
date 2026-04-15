"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authAdmin = authAdmin;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const revokedTokens_1 = require("../utils/revokedTokens");
function authAdmin(req, res, next) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token)
        return res.status(401).json({ message: "No token" });

    if ((0, revokedTokens_1.isTokenRevoked)(token)) {
        return res.status(401).json({ message: "Token revoked. Please login again." });
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        if (payload?.role !== "admin") {
            return res.status(403).json({ message: "Forbidden" });
        }
        req.user = payload;
        next();
    }
    catch {
        return res.status(401).json({ message: "Invalid token" });
    }
}
