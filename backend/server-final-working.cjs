console.log('=== FINAL SERVER STARTING ===');
const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const cors = require('cors');

// Polyfill crypto for ES modules
global.crypto = require('crypto').webcrypto;

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
app.use(cors({
  origin: ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:8081', 'http://127.0.0.1:8081'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(cookieParser());

// Explicit preflight handler (must be before routes)
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || 'http://localhost:8081');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Basic routes
app.get("/", (req, res) => res.send("API running"));
app.get("/test", (req, res) => res.json({ status: "ok", message: "Server is responding" }));

// Load everything before starting server
async function initializeServer() {
  console.log('\n🚀 Initializing server...\n');
  
  // Connect to databases first
  console.log('Connecting to MongoDB...');
  const { default: connectDB } = await import('./db.js');
  await connectDB();
  console.log('✅ MongoDB connected');
  
  console.log('Connecting to PostgreSQL...');
  const { connectPostgres } = await import('./config/postgres.js');
  const pgConnected = await connectPostgres();
  console.log(`✅ PostgreSQL ${pgConnected ? 'connected' : 'failed'}`);
  
  // Import and mount all routes
  console.log('\nLoading routes...');
  
  const authRoutes = (await import('./routes/authRoutes.js')).default;
  app.use("/api/auth", authRoutes);
  console.log('✅ Auth routes loaded');
  
  const chatRoutes = (await import('./routes/chatRoutes.js')).default;
  app.use("/api/chat", chatRoutes);
  console.log('✅ Chat routes loaded');
  
  const aiRoutes = (await import('./routes/aiRoutes.js')).default;
  app.use("/api/ai", aiRoutes);
  console.log('✅ AI routes loaded');
  
  const fileRoutes = (await import('./routes/fileRoutes.js')).default;
  app.use("/api/files", fileRoutes);
  console.log('✅ File routes loaded');
  
  const userRoutesModule = await import('./routes/userroutes.js');
  const userroutes = userRoutesModule.default || userRoutesModule.router || userRoutesModule;
  app.use("/api/users", userroutes);
  console.log('✅ User routes loaded');
  
  const waitlistroutes = (await import('./routes/waitlistroutes.js')).default;
  app.use("/api/waitlist", waitlistroutes);
  console.log('✅ Waitlist routes loaded');
  
  // Start server after everything is loaded
  app.listen(PORT, () => {
    console.log(`\n🌐 Server listening on port ${PORT}`);
    console.log(`📊 MongoDB: Connected`);
    console.log(`📊 PostgreSQL: ${pgConnected ? 'Connected' : 'Failed'}`);
    console.log('\n🎉 Server is ready!');
    console.log('Available endpoints:');
    console.log('  GET  /test');
    console.log('  POST /api/auth/login');
    console.log('  POST /api/auth/logout');
    console.log('  GET  /api/chat/*');
    console.log('  POST /api/ai/*');
    console.log('  GET  /api/files/*');
    console.log('  GET  /api/users/*');
    console.log('  POST /api/waitlist/*');
  });
}

// Start the server
initializeServer().catch(error => {
  console.error('❌ Server initialization failed:', error);
  process.exit(1);
});
