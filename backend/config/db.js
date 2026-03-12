// backend/config/db.js
const mongoose = require("mongoose");

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI;

  try {
    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log("✅ MongoDB Atlas connected");
  } catch (error) {
    console.error("❌ MongoDB Atlas connection failed:", error.message);
    process.exit(1);
  }
};

/* ---------- Connection Events ---------- */

mongoose.connection.on("connected", () => {
  console.log("📦 Mongoose connected");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ Mongoose error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  console.log("⚠️ Mongoose disconnected");
});

process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("🛑 MongoDB connection closed due to app termination");
  process.exit(0);
});

module.exports = connectDB;
