"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.revokeToken = revokeToken;
exports.isTokenRevoked = isTokenRevoked;
const revoked = new Map();
function cleanup() {
    const now = Date.now();
    for (const [token, exp] of revoked.entries()) {
        if (exp <= now)
            revoked.delete(token);
    }
}
function revokeToken(token, expiresAtMs) {
    cleanup();
    revoked.set(token, expiresAtMs);
}
function isTokenRevoked(token) {
    cleanup();
    const exp = revoked.get(token);
    if (!exp)
        return false;
    if (Date.now() > exp) {
        revoked.delete(token);
        return false;
    }
    return true;
}
