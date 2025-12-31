console.log('=== SERVER WITH POSTGRESQL STARTING ===');
const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const cors = require('cors');

dotenv.config();

const app = express();
const PORT = 3000;

// CORS configuration
app.use(cors({
  origin: ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:8081', 'http://127.0.0.1:8081'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(cookieParser());

// Basic routes
app.get("/", (req, res) => res.send("API running"));
app.get("/test", (req, res) => res.json({ status: "ok", message: "Server is responding" }));

// Start server first, then add routes dynamically
app.listen(PORT, async () => {
  console.log(`\n🌐 Server listening on port ${PORT}`);
  
  try {
    console.log('\n🚀 Loading routes and databases...\n');
    
    // Import and connect to MongoDB
    console.log('Connecting to MongoDB...');
    const { default: connectDB } = await import('./db.js');
    await connectDB();
    console.log('✅ MongoDB connected');
    
    // Import and connect to PostgreSQL (without sync)
    console.log('Connecting to PostgreSQL...');
    const { connectPostgres } = await import('./config/postgres.js');
    const pgConnected = await connectPostgres();
    
    if (pgConnected) {
      console.log('✅ PostgreSQL connected (skipping sync - tables already exist)\n');
    }
    
    // Import routes dynamically with error handling
    console.log('Importing routes...');
    
    try {
      const authRoutes = (await import('./routes/authRoutes.js')).default;
      app.use("/api/auth", authRoutes);
      console.log('✅ Auth routes loaded');
    } catch (e) {
      console.error('❌ Failed to load auth routes:', e.message);
    }
    
    try {
      const chatRoutes = (await import('./routes/chatRoutes.js')).default;
      app.use("/api/chat", chatRoutes);
      console.log('✅ Chat routes loaded');
    } catch (e) {
      console.error('❌ Failed to load chat routes:', e.message);
    }
    
    try {
      const aiRoutes = (await import('./routes/aiRoutes.js')).default;
      app.use("/api/ai", aiRoutes);
      console.log('✅ AI routes loaded');
    } catch (e) {
      console.error('❌ Failed to load AI routes:', e.message);
    }
    
    try {
      const fileRoutes = (await import('./routes/fileRoutes.js')).default;
      app.use("/api/files", fileRoutes);
      console.log('✅ File routes loaded');
    } catch (e) {
      console.error('❌ Failed to load file routes:', e.message);
    }
    
    try {
      const userRoutesModule = await import('./routes/userroutes.js');
      const userroutes = userRoutesModule.default || userRoutesModule.router || userRoutesModule;
      app.use("/api/users", userroutes);
      console.log('✅ User routes loaded');
    } catch (e) {
      console.error('❌ Failed to load user routes:', e.message);
    }
    
    try {
      const waitlistroutes = (await import('./routes/waitlistroutes.js')).default;
      app.use("/api/waitlist", waitlistroutes);
      console.log('✅ Waitlist routes loaded');
    } catch (e) {
      console.error('❌ Failed to load waitlist routes:', e.message);
    }
    
    console.log('\n🎉 Server is ready!\n');
    console.log('Available endpoints:');
    console.log('  GET  /test');
    console.log('  POST /api/auth/login');
    console.log('  POST /api/auth/logout');
    console.log('  GET  /api/chat/*');
    console.log('  POST /api/ai/*');
    console.log('  GET  /api/files/*');
    console.log('  GET  /api/users/*');
    console.log('  POST /api/waitlist/*');
    console.log('\n📊 Database Status:');
    console.log(`  MongoDB: Connected`);
    console.log(`  PostgreSQL: ${pgConnected ? 'Connected' : 'Failed'}\n`);
    
  } catch (error) {
    console.error('❌ Error during startup:', error);
  }
});
