import "dotenv/config";
import app from "./app";
import { connectDB } from "./config/db";
import { verifySmtp } from "./utils/mailer";

const PORT = Number(process.env.PORT || 5000);

async function bootstrap() {
    await connectDB();
    await verifySmtp();
    app.listen(PORT, () => console.log(`Server running on ${PORT}`));
}

bootstrap().catch((err) => {
    console.error("Startup error:", err);
    process.exit(1);
});