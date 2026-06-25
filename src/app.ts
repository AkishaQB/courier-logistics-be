import express from "express";
import cors from "cors";
import { errorHandler } from "./middlewares/errorHandler";
import regionRoutes from "./routes/regions";
import packageRoutes from "./routes/packages";
import bagRoutes from "./routes/bags";
import truckRoutes from "./routes/trucks";
import truckScheduleRoutes from "./routes/truckSchedules";
import dashboardRoutes from "./routes/dashboard";

const app = express();

// ─── CORS ────────────────────────────────────────────────
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Parse JSON request bodies
app.use(express.json());

// Health-check route
app.get("/", (_, res) => {
  res.json({
    message: "Courier Logistics API Running",
    version: "2.0.0",
    routes: [
      "GET  /api/regions",
      "GET  /api/regions/all",
      "GET  /api/regions/:id",
      "GET  /api/packages",
      "GET  /api/packages/:id",
      "GET  /api/packages/track/:trackingId",
      "POST /api/packages",
      "PATCH /api/packages/:id/status",
      "GET  /api/packages/:id/history",
      "GET  /api/bags",
      "GET  /api/bags/:id",
      "POST /api/bags",
      "POST /api/bags/:id/packages",
      "DELETE /api/bags/:id/packages/:packageId",
      "PATCH /api/bags/:id/seal",
      "GET  /api/trucks",
      "GET  /api/trucks/:id",
      "POST /api/trucks",
      "PATCH /api/trucks/:id",
      "GET  /api/truck-schedules",
      "GET  /api/truck-schedules/:id",
      "POST /api/truck-schedules",
      "POST /api/truck-schedules/:id/bags",
      "PATCH /api/truck-schedules/:id/depart",
      "PATCH /api/truck-schedules/:id",
      "GET  /api/dashboard",
    ],
  });
});

// ─── Routes ──────────────────────────────────────────────
app.use("/api/regions", regionRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/bags", bagRoutes);
app.use("/api/trucks", truckRoutes);
app.use("/api/truck-schedules", truckScheduleRoutes);
app.use("/api/dashboard", dashboardRoutes);

// ─── Error Handler (must be AFTER all routes) ────────────
app.use(errorHandler);

export default app;
