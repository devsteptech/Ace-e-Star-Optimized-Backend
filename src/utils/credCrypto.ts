import crypto from "crypto";

function keyFromSecret() {
    const secret = process.env.CRED_ENC_SECRET;
    if (!secret) throw new Error("CRED_ENC_SECRET missing in .env");
    return crypto.createHash("sha256").update(secret).digest(); 
}

export function encryptText(plain: string) {
    const key = keyFromSecret();
    const iv = crypto.randomBytes(12); 
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptText(b64: string) {
    const raw = Buffer.from(b64, "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const enc = raw.subarray(28);

    const key = keyFromSecret();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return dec.toString("utf8");
}