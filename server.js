const express = require("express");
const cors = require("cors");
const config = require("./server/config/config");
const connectDB = require("./server/config/db");

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

// Keep JSON requests bounded so oversized payloads cannot exhaust server memory.
app.use(express.json({ limit: "2mb" }));

console.log("Connecting to MongoDB Atlas...");

connectDB(config.mongoURI)
  .then(() => {
    // Mount routes ONLY after DB handshake completes
    const authRoutes = require("./server/routes/authRoutes");
    const attendanceRoutes = require("./server/routes/attendanceRoutes");
    const ownerRoutes = require("./server/routes/ownerRoutes");
    const fishRoutes = require("./server/routes/fishRoutes");
    const storeRoutes = require("./server/routes/storeRoutes");
    const noteRoutes = require("./server/routes/noteRoutes");
    const salesRoutes = require("./server/routes/salesRoutes");
    const operationsRoutes = require("./server/routes/operationsRoutes");
    app.use("/api/auth", authRoutes);
    app.use("/api/attendance", attendanceRoutes);
    app.use("/api/owner", ownerRoutes);
    app.use("/api/fish", fishRoutes);
    app.use("/api/store", storeRoutes);
    app.use("/api/notes", noteRoutes);
    app.use("/api/sales", salesRoutes);
    app.use("/api/operations", operationsRoutes);

    app.get("/", (req, res) => {
      res.send("Fishonitory Backend API is Running");
    });

    app.listen(config.port, () => {
      console.log(`Server running on http://localhost:${config.port}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB Connection Error:", err.message);
    process.exit(1);
  });
