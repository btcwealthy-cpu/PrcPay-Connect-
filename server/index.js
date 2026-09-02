import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cron from "node-cron";
import db from "./db.js";
import { exportToDrive, isConfigured } from "./exporter.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "prcchat-dev-secret";
const GENERAL_CONV = db.prepare("SELECT id FROM conversations WHERE name = ?").get("general")?.id;

// --- Auth middleware ---
function auth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// --- Auth routes ---
app.post("/api/auth/register", (req, res) => {
  const { email, password, displayName } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return res.status(409).json({ error: "Email already registered" });
  const hash = bcrypt.hashSync(password, 10);
  const colors = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#ef4444", "#06b6d4"];
  const avatarColor = colors[Math.floor(Math.random() * colors.length)];
  const info = db.prepare("INSERT INTO users (email, password, display_name, avatar_color) VALUES (?, ?, ?, ?)")
    .run(email, hash, displayName || email.split("@")[0], avatarColor);
  // Add to general conversation
  db.prepare("INSERT OR IGNORE INTO conversation_members (conversation_id, user_id) VALUES (?, ?)").run(GENERAL_CONV, info.lastInsertRowid);
  const user = db.prepare("SELECT id, email, display_name, status_message, avatar_color FROM users WHERE id = ?").get(info.lastInsertRowid);
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
  res.json({ token, user });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  db.prepare("INSERT OR IGNORE INTO conversation_members (conversation_id, user_id) VALUES (?, ?)").run(GENERAL_CONV, user.id);
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
  res.json({ token, user: { id: user.id, email: user.email, display_name: user.display_name, status_message: user.status_message, avatar_color: user.avatar_color } });
});

app.get("/api/auth/me", auth, (req, res) => {
  const user = db.prepare("SELECT id, email, display_name, status_message, avatar_color FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user });
});

// --- Profile routes ---
app.put("/api/profile", auth, (req, res) => {
  const { display_name, status_message } = req.body;
  db.prepare("UPDATE users SET display_name = ?, status_message = ? WHERE id = ?")
    .run(display_name || "", status_message || "", req.user.id);
  const user = db.prepare("SELECT id, email, display_name, status_message, avatar_color FROM users WHERE id = ?").get(req.user.id);
  res.json({ user });
});

// --- Users (for contact list / member display) ---
app.get("/api/users", auth, (_req, res) => {
  const users = db.prepare("SELECT id, display_name, status_message, avatar_color FROM users ORDER BY display_name").all();
  res.json({ users });
});

// --- Messages routes ---
app.get("/api/messages/:conversationId", auth, (req, res) => {
  const messages = db.prepare(`
    SELECT m.id, m.content, m.created_at, m.sender_id, u.display_name, u.avatar_color
    FROM messages m JOIN users u ON m.sender_id = u.id
    WHERE m.conversation_id = ?
    ORDER BY m.created_at ASC LIMIT 200
  `).all(req.params.conversationId);
  res.json({ messages });
});

app.post("/api/messages", auth, (req, res) => {
  const { conversationId, content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: "Message required" });
  const info = db.prepare("INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)")
    .run(conversationId, req.user.id, content.trim());
  const msg = db.prepare(`
    SELECT m.id, m.content, m.created_at, m.sender_id, u.display_name, u.avatar_color
    FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?
  `).get(info.lastInsertRowid);
  io.to(`conv-${conversationId}`).emit("message", msg);
  res.json({ message: msg });
});

// --- Conversations ---
app.get("/api/conversations", auth, (req, res) => {
  const convs = db.prepare(`
    SELECT c.id, c.name, c.is_group,
      (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at
    FROM conversations c
    JOIN conversation_members cm ON cm.conversation_id = c.id
    WHERE cm.user_id = ?
    ORDER BY c.name
  `).all(req.user.id);
  res.json({ conversations: convs });
});

// --- Socket.io ---
io.on("connection", (socket) => {
  socket.on("join", (conversationId) => {
    socket.join(`conv-${conversationId}`);
  });
  socket.on("leave", (conversationId) => {
    socket.leave(`conv-${conversationId}`);
  });
});

const PORT = 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`PrcChat server running on port ${PORT}`);
});
