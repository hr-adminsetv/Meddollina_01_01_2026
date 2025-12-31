import express from "express";
import cors from "cors";

const app = express();
const PORT = 5003;

app.use(cors({
  origin: ['http://localhost:8080', 'http://127.0.0.1:8080'],
  credentials: true,
}));

// Debug middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.get("/", (req, res) => res.send("Test API running"));
app.get("/test", (req, res) => res.json({ status: "ok", message: "Test server is responding" }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🌐 Test server listening on port ${PORT}\n`);
});

console.log("Starting test server...");
