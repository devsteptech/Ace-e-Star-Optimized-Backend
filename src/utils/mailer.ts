import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || "true") === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

export async function sendEventManagerCredentials(opts: {
    to: string;
    eventName: string;
    password: string;
}) {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const frontend = process.env.FRONTEND_URL || "http://localhost:5173";
    const loginUrl = `${frontend}/UserLogin`;

    await transporter.sendMail({
        from,
        to: opts.to,
        subject: `Event Manager Access - ${opts.eventName}`,
        text:
            `You have been added as Event Manager.\n\n` +
            `Event: ${opts.eventName}\n` +
            `Login URL: ${loginUrl}\n` +
            `Username: ${opts.to}\n` +
            `Password: ${opts.password}\n\n` +
            `Please change it after login (if feature available).`,
    });
}


export async function verifySmtp() {
    await transporter.verify();
    console.log("SMTP verified: login OK");
}