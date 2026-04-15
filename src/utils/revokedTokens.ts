
const revoked = new Map<string, number>(); 

function cleanup() {
    const now = Date.now();
    for (const [token, exp] of revoked.entries()) {
        if (exp <= now) revoked.delete(token);
    }
}

export function revokeToken(token: string, expiresAtMs: number) {
    cleanup();
    revoked.set(token, expiresAtMs);
}

export function isTokenRevoked(token: string) {
    cleanup();
    const exp = revoked.get(token);
    if (!exp) return false;
    if (Date.now() > exp) {
        revoked.delete(token);
        return false;
    }
    return true;
}