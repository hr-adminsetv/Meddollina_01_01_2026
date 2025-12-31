import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import connectDB from "./db.js";
import { connectPostgres, syncDatabase } from "./config/postgres.js";
import waitlistroutes from "./routes/waitlistroutes.js";
import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import fileRoutes from "./routes/fileRoutes.js";
import userroutes from "./routes/userroutes.js";

dotenv.config();

const app = express();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:8081', 'http://127.0.0.1:8081'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires', 'X-Request-ID', 'X-Cache-Bust', 'X-Request-Time'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.use(express.json());
app.use(cookieParser());

// Middleware to log AI requests (moved after express.json)
app.use("/api/ai", (req, res, next) => {
  console.log(`[AI Route] ${req.method} ${req.path}`);
  console.log(`[AI Route] Content-Type:`, req.headers['content-type']);
  console.log(`[AI Route] Content-Length:`, req.headers['content-length']);
  console.log(`[AI Route] Headers:`, req.headers);
  console.log(`[AI Route] Raw body:`, req.body);
  console.log(`[AI Route] Body keys:`, Object.keys(req.body || {}));
  if (req.body && req.body.ocr_content) {
    console.log(`[AI Route] OCR content length:`, req.body.ocr_content.length);
    console.log(`[AI Route] OCR content preview:`, req.body.ocr_content.substring(0, 200) + '...');
  }
  // Log the entire request for debugging
  console.log(`[AI Route] Full request:`, {
    method: req.method,
    path: req.path,
    headers: req.headers,
    body: req.body
  });
  next();
});

// Handle preflight requests explicitly (before routes)
app.options('*', (req, res) => {
  console.log('[CORS] OPTIONS request received for:', req.path);
  console.log('[CORS] Origin:', req.headers.origin);
  console.log('[CORS] Request Headers:', req.headers['access-control-request-headers']);
  const origin = req.headers.origin;
  if (['http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:8081', 'http://127.0.0.1:8081'].includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    console.log('[CORS] Origin allowed:', origin);
  } else {
    console.log('[CORS] Origin blocked:', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Cache-Control, Pragma, Expires, X-Request-ID, X-Cache-Bust, X-Request-Time');
  res.header('Access-Control-Allow-Credentials', 'true');
  console.log('[CORS] Preflight response sent');
  res.send(204);
});

// Add middleware to log ALL requests
app.use((req, res, next) => {
  console.log(`=== [ALL REQUESTS] ${req.method} ${req.path} ===`);
  console.log(`=== [ALL REQUESTS] Origin: ${req.headers.origin} ===`);
  console.log(`=== [ALL REQUESTS] Full URL: ${req.protocol}://${req.get('host')}${req.originalUrl} ===`);
  console.log(`=== [ALL REQUESTS] User-Agent: ${req.headers['user-agent']} ===`);
  console.log(`=== [ALL REQUESTS] Timestamp: ${new Date().toISOString()} ===`);
  next();
});

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  next();
});

// Test endpoint
app.get("/api/test", (req, res) => {
  console.log("[TEST] Test endpoint hit!");
  res.json({ 
    success: true, 
    message: "Backend is reachable!",
    timestamp: new Date().toISOString()
  });
});

// Add a simple POST test endpoint
app.post("/api/test-post", (req, res) => {
  console.log("[TEST-POST] POST test endpoint hit!");
  console.log("[TEST-POST] Body:", req.body);
  res.json({ 
    success: true, 
    message: "Backend POST test successful!",
    receivedBody: req.body,
    timestamp: new Date().toISOString()
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/users", userroutes);

// ✅ DEBUG (do not skip)
console.log("waitlistroutes typeof:", typeof waitlistroutes);
console.log("waitlistroutes value:", waitlistroutes);

app.use("/api/waitlist", waitlistroutes);

app.get("/", (req, res) => res.send("API running"));
app.get("/test", (req, res) => res.json({ status: "ok", message: "Server is responding" }));

const PORT = process.env.PORT || 5000;

// Start server after connecting to databases
async function startServer() {
  console.log('Starting async function...');
  
  // Connect to both databases
  console.log("\n🚀 Initializing databases...\n");

  // MongoDB connection
  console.log('Connecting to MongoDB...');
  await connectDB();
  console.log('MongoDB connected successfully');

  // PostgreSQL connection
  console.log('Connecting to PostgreSQL...');
  const pgConnected = await connectPostgres();
  console.log('PostgreSQL connection result:', pgConnected);
  
  if (pgConnected) {
    console.log('Syncing PostgreSQL tables...');
    await syncDatabase();
    console.log("\n✅ PostgreSQL tables ready for use\n");
  }

  console.log('Starting Express server...');
  app.listen(PORT, () => {
    console.log(`\n🌐 Server listening on port ${PORT}`);
    console.log(`📊 MongoDB: Connected`);
    console.log(`📊 PostgreSQL: ${pgConnected ? 'Connected' : 'Failed'}\n`);
  });
}

startServer().catch(console.error);
