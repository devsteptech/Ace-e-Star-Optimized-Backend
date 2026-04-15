import express from "express";
import cors from "cors";
import morgan from "morgan";
import uploadRoutes from "./routes/upload.routes";
import authRoutes from "./routes/auth.routes";
import path from "path";
import templateRoutes from "./routes/template.routes";
import eventRoutes from "./routes/event.routes";
import eventmanRoutes from "./routes/eventman.routes";
import guestRoutes from "./routes/guest.routes";
import eventmanGuestsRoutes from "./routes/eventman.guests.routes";
import eventmanReportsRoutes from "./routes/eventman.reports.routes";
import reportsRoutes from "./routes/reports.routes";
import adminDashboardRoutes from "./routes/admin.dashboard.routes"


const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/templates", templateRoutes);

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/api/uploads", uploadRoutes);
app.use("/api/templates", templateRoutes);

app.use("/api/events", eventRoutes);
app.use("/api/eventman", eventmanRoutes);
app.use("/api", guestRoutes);
app.use("/api/eventman", eventmanGuestsRoutes);

app.use("/api/eventman", eventmanReportsRoutes);
app.use("/api", reportsRoutes);


app.use("/api/admin", adminDashboardRoutes);

export default app;