const path = require("path");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const saveRoutes = require("./routes/saveRoutes");
const danmakuRoutes = require("./routes/danmakuRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/save", saveRoutes);
app.use("/api/danmaku", danmakuRoutes);

app.get("/api/health", (req, res) => {
  const isMongoConnected = mongoose.connection.readyState === 1;
  const requiresDatabase = process.env.NODE_ENV === "production";
  res.json({
    ok: true,
    database: isMongoConnected ? "mongodb" : requiresDatabase ? "unavailable" : "memory",
    persistent: isMongoConnected,
    requiresDatabase
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

async function startServer() {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000
      });
      console.log("MongoDB connected.");
    } catch (error) {
      console.warn("MongoDB connection failed. Using temporary memory storage.");
      console.warn(error.message);
    }
  } else {
    console.warn("MONGODB_URI is not set. Using temporary memory storage.");
  }

  app.listen(PORT, () => {
    console.log(`Campus game is running at http://localhost:${PORT}`);
  });
}

startServer();
