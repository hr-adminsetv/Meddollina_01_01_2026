console.log('=== SERVER STARTING WITH NODE 18 ===');
import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = 3000;

// CORS configuration
app.use(cors({
  origin: ['http://localhost:8080', 'http://127.0.0.1:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(cookieParser());

// Import routes after basic setup
console.log('Importing routes...');
import waitlistroutes from "./routes/waitlistroutes.js";
import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import fileRoutes from "./routes/fileRoutes.js";
import * as userRoutesModule from "./routes/userroutes.js";
const userroutes = userRoutesModule.default || userRoutesModule.router || userRoutesModule;

console.log('Routes imported successfully');

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/users", userroutes);
app.use("/api/waitlist", waitlistroutes);

app.get("/", (req, res) => res.send("API running"));
app.get("/test", (req, res) => res.json({ status: "ok", message: "Server is responding" }));

// Start server and connect to databases
async function startServer() {
  console.log('\n🚀 Starting server and connecting to databases...\n');
  
  // Import and connect to MongoDB
  console.log('Connecting to MongoDB...');
  import connectDB from "./db.js";
  await connectDB();
  console.log('✅ MongoDB connected');
  
  // Import and connect to PostgreSQL
  console.log('Connecting to PostgreSQL...');
  import { connectPostgres, syncDatabase } from "./config/postgres.js";
  const pgConnected = await connectPostgres();
  
  if (pgConnected) {
    console.log('Syncing PostgreSQL tables...');
    await syncDatabase();
    console.log('✅ PostgreSQL tables ready\n');
  }
  
  app.listen(PORT, () => {
    console.log(`\n🌐 Server listening on port ${PORT}`);
    console.log(`📊 MongoDB: Connected`);
    console.log(`📊 PostgreSQL: ${pgConnected ? 'Connected' : 'Failed'}\n`);
  });
}

startServer().catch(console.error);
