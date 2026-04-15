"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminLogin = adminLogin;
exports.me = me;
exports.adminLogout = adminLogout;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const revokedTokens_1 = require("../utils/revokedTokens");
async function adminLogin(req, res) {
    const { email, password } = (req.body ?? {});
    if (!email || !password) {
        return res.status(400).json({ message: "email and password are required" });
    }
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
        return res.status(500).json({ message: "Admin credentials not set in .env" });
    }
    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
        return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = jsonwebtoken_1.default.sign({ id: "admin", role: "admin", email: ADMIN_EMAIL }, process.env.JWT_SECRET, { expiresIn: "7d" });
    return res.json({
        token,
        user: { id: "admin", role: "admin", email: ADMIN_EMAIL }
    });
}
async function me(req, res) {
    return res.json({ user: req.user });
}

async function adminLogout(req, res) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token)
        return res.status(401).json({ message: "No token" });
    const decoded = jsonwebtoken_1.default.decode(token);
    const expMs = decoded?.exp ? decoded.exp * 1000 : Date.now() + 7 * 24 * 60 * 60 * 1000;
    (0, revokedTokens_1.revokeToken)(token, expMs);
    return res.json({ message: "Logged out" });
}
