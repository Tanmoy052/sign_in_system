// backend/server.js
const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");

// Initialize Database
connectDB();

const app = express();

/**
 * PRODUCTION MIDDLEWARE
 */

// 1. Security Headers (Helmet)
app.use(helmet());

// 2. Trust proxy is required for express-rate-limit to work correctly on Render/Vercel
app.set("trust proxy", 1);

// 3. CORS Configuration
const allowedOrigins = [
  "https://signin-portal.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        return callback(new Error("CORS policy violation"), false);
      }
      return callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    optionsSuccessStatus: 200,
  }),
);

// 4. Input Sanitization (NoSQL Injection)
app.use(mongoSanitize());

// 5. Prevent HTTP Parameter Pollution
app.use(hpp());

// 6. Response Compression
app.use(compression());

// 7. Request Logging (Morgan)
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// 8. Body Parser
app.use(express.json({ limit: "10kb" })); // Limit body size to prevent DOS

/**
 * RATE LIMITING
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message:
      "Too many requests from this IP, please try again after 15 minutes",
  },
});
app.use("/api", globalLimiter);

/**
 * ROUTES
 */

// API Routes
app.use("/api/auth", authRoutes);

// Health Check Endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Root Route
app.get("/", (req, res) => {
  res.send("Auth API Gateway v1.0.0 running in production mode");
});

/**
 * ERROR HANDLING
 */

// 404 Handler
app.use("*", (req, res) => {
  res.status(404).json({
    status: "error",
    message: `Can't find ${req.originalUrl} on this server`,
  });
});

// Global Production Error Handler
app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  // Specialized logging for authentication and email errors
  if (err.statusCode >= 500) {
    console.error(`[CRITICAL ERROR] ${req.method} ${req.originalUrl}:`, err);
  } else {
    console.warn(
      `[API WARNING] ${req.method} ${req.originalUrl}:`,
      err.message,
    );
  }

  if (process.env.NODE_ENV === "development") {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  } else {
    // Production: Don't leak error details
    res.status(err.statusCode).json({
      status: err.status,
      message: err.isOperational ? err.message : "Something went very wrong!",
    });
  }
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`
🚀 Server running in ${process.env.NODE_ENV || "development"} mode
📡 Listening on port ${PORT}
🔗 Health check: http://localhost:${PORT}/health
  `);
});

// Handle unhandled rejections
process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
