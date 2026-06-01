import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createServer } from "http";
import { env } from "./config/env";
import { prisma } from "./config/database";
import { generalLimiter } from "./middleware/rate-limit";
import { errorHandler } from "./middleware/error-handler";
import routes from "./routes";
import { setupSocketIO } from "./sockets";

const app: Express = express();
const httpServer = createServer(app);

// Stripe webhook needs raw body
app.use("/api/v1/payments/webhook", express.raw({ type: "application/json" }));

// Global middleware
// Comma-separated origins in WEB_URL allow multiple frontends (prod + preview)
const allowedOrigins = env.WEB_URL.split(",").map((o) => o.trim()).filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  }),
);
app.use(helmet());
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "10mb" }));
app.use(generalLimiter);

// Health check — used by Render/Fly liveness probes
app.get("/health", async (_req, res) => {
  let db: "ok" | "err" = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = "err";
  }
  const status = db === "ok" ? "ok" : "degraded";
  res.status(db === "ok" ? 200 : 503).json({
    status,
    db,
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use("/api/v1", routes);

// Error handler (must be last)
app.use(errorHandler);

// Socket.IO
setupSocketIO(httpServer);

// Start server
httpServer.listen(env.API_PORT, () => {
  console.log(`FAINEANT API running on port ${env.API_PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
});

export default app;
