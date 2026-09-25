const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoose = require("mongoose");
const config = require("./server/config/config");
const connectDB = require("./server/config/db");
const Payroll = require("./server/models/Payroll");

const app = express();
const DB_RETRY_DELAY_MS = 10_000;
let reconnectTimer = null;
let connectionAttemptInProgress = false;

if (config.nodeEnv === "production") {
  const required = ["EMAIL_USER", "EMAIL_PASS", "CLIENT_URL"];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) {
    console.warn(
      `Production env warning: missing ${missing.join(", ")}. The server will continue in a degraded mode until the deployment platform injects them.`,
    );
  }
}

app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
  }),
);
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Cache-Control", "no-store");
  if (config.nodeEnv === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true,
  }),
);

app.use(express.json({ limit: "2mb" }));

// Monitor Mongoose connection events globally
mongoose.connection.on("connected", () => {
  console.log(">>> Mongoose event: Connected to MongoDB Atlas <<<");
});

mongoose.connection.on("error", (err) => {
  console.error(">>> Mongoose event: Connection error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  console.warn(">>> Mongoose event: Disconnected from MongoDB Atlas <<<");
  scheduleDatabaseReconnect();
});

function scheduleDatabaseReconnect() {
  if (reconnectTimer || connectionAttemptInProgress || mongoose.connection.readyState === 1) {
    return;
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectToDatabase();
  }, DB_RETRY_DELAY_MS);
}

async function connectToDatabase() {
  if (connectionAttemptInProgress || mongoose.connection.readyState === 1) {
    return;
  }

  connectionAttemptInProgress = true;
  let connectionFailed = false;
  try {
    await connectDB(config.mongoURI);
  } catch (err) {
    connectionFailed = true;
    console.error("MongoDB connection attempt failed:", err.message);
  } finally {
    connectionAttemptInProgress = false;
    if (connectionFailed) {
      scheduleDatabaseReconnect();
    }
  }
}


// Updated health check: keep the response explicit and trigger a reconnect attempt
// when the database is disconnected, without hiding the real readiness state.
app.get("/health", (req, res) => {
  const state = mongoose.connection.readyState;
  const isConnected = state === 1;

  if (!isConnected && !connectionAttemptInProgress) {
    scheduleDatabaseReconnect();
  }

  const statusMap = {
    0: { code: 503, status: "degraded", database: "disconnected" },
    1: { code: 200, status: "healthy", database: "connected" },
    2: { code: 503, status: "bootstrapping", database: "connecting" },
    3: { code: 503, status: "degraded", database: "disconnecting" },
  };

  const response = statusMap[state] || { code: 503, status: "degraded", database: "unknown" };

  res.status(response.code).json({
    status: response.status,
    database: response.database,
    readyState: state,
    reconnectScheduled: !isConnected && !connectionAttemptInProgress,
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (req, res) => {
  res.send("Fishonitory Backend API is Running");
});

// Mount routes
app.use("/api/auth", require("./server/routes/authRoutes"));
app.use("/api/attendance", require("./server/routes/attendanceRoutes"));
app.use("/api/owner", require("./server/routes/ownerRoutes"));
app.use("/api/fish", require("./server/routes/fishRoutes"));
app.use("/api/store", require("./server/routes/storeRoutes"));
app.use("/api/notes", require("./server/routes/noteRoutes"));
app.use("/api/sales", require("./server/routes/salesRoutes"));
app.use("/api/orders", require("./server/routes/orderRoutes"));
app.use("/api/operations", require("./server/routes/operationsRoutes"));
app.use("/api/payroll", require("./server/routes/payrollRoutes"));

app.use((error, req, res, next) => {
  console.error("Unhandled API error:", error.message);
  if (res.headersSent) return next(error);
  return res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : "An unexpected server error occurred." });
});

// LEGACY STARTUP ORDER (saved for easy rollback):
// app.listen(config.port, () => {
//   console.log(`Server running on http://localhost:${config.port}`);
//   console.log("Connecting to MongoDB Atlas...");
//   connectToDatabase();
// });

async function startServer() {
  console.log("Connecting to MongoDB Atlas...");

  try {
    await connectToDatabase();
    await Payroll.backfillMissingBenefitTypes();
    app.listen(config.port, () => {
      console.log(`Server running on http://localhost:${config.port}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed during startup. Starting server in degraded mode.");
    app.listen(config.port, () => {
      console.log(`Server running on http://localhost:${config.port}`);
    });
  }
}

startServer();
