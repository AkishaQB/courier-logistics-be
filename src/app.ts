import express from "express";
import cors from "cors";
import { errorHandler } from "./middlewares/errorHandler";
import { authenticate } from "./middlewares/auth";
import { requireRole } from "./middlewares/requireRole";
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
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Parse JSON request bodies
app.use(express.json());

// Shorthand: logistics routes always require both middlewares in sequence
const logisticsAuth = [authenticate, requireRole("logistics", "admin")];

// Health-check route (public)
app.get("/", (_, res) => {
  res.json({
    message: "Courier Logistics API Running",
    version: "2.0.0",
    auth: "[auth] = requires JWT with role: logistics | admin",
    routes: [
      "GET  /api/regions                         [public]",
      "GET  /api/regions/all                     [public]",
      "GET  /api/regions/:id                     [public]",
      "POST /api/regions                         [auth]",
      "GET  /api/packages                        [public]",
      "GET  /api/packages/:id                    [public]",
      "GET  /api/packages/track/:trackingId      [public]",
      "GET  /api/packages/:id/history            [public]",
      "POST /api/packages                        [auth]",
      "PATCH /api/packages/:id/status            [auth]",
      "GET  /api/bags                            [auth]",
      "GET  /api/bags/:id                        [auth]",
      "POST /api/bags                            [auth]",
      "POST /api/bags/:id/packages               [auth]",
      "DELETE /api/bags/:id/packages/:pkgId      [auth]",
      "PATCH /api/bags/:id/seal                  [auth]",
      "GET  /api/trucks                          [auth]",
      "GET  /api/trucks/:id                      [auth]",
      "POST /api/trucks                          [auth]",
      "PATCH /api/trucks/:id                     [auth]",
      "GET  /api/truck-schedules                 [auth]",
      "GET  /api/truck-schedules/:id             [auth]",
      "POST /api/truck-schedules                 [auth]",
      "POST /api/truck-schedules/:id/bags        [auth]",
      "PATCH /api/truck-schedules/:id/depart     [auth]",
      "PATCH /api/truck-schedules/:id            [auth]",
      "GET  /api/dashboard                       [auth]",
      "GET  /api/dashboard/new-arrivals          [auth]",
      "GET  /api/dashboard/truck-arrivals        [auth]",
      "GET  /api/dashboard/loaded                [auth]",
      "GET  /api/dashboard/delayed               [auth]",
    ],
  });
});

// ─── Public Routes (read-only, no auth required) ─────────
// Regions & packages: GET routes are open so the front-office
// and tracking integrations can query without a session.
app.use("/api/regions", regionRoutes);
app.use("/api/packages", packageRoutes);

// ─── Protected Routes (logistics | admin only) ───────────
// All operational routes require a JWT whose role is "logistics"
// or "admin". A front-office "staff" JWT is rejected with 403.
app.use("/api/bags", ...logisticsAuth, bagRoutes);
app.use("/api/trucks", ...logisticsAuth, truckRoutes);
app.use("/api/truck-schedules", ...logisticsAuth, truckScheduleRoutes);
app.use("/api/dashboard", ...logisticsAuth, dashboardRoutes);

// ─── Error Handler (must be AFTER all routes) ────────────
app.use(errorHandler);

export default app;
