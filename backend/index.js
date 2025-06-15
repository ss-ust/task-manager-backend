// backend/index.js
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// better-sqlite3 veritabanı bağlantısı
const dbPath = path.resolve(__dirname, 'taskmanager.db');
const db = new Database(dbPath);
console.log("Better-SQLite3 veritabanına başarıyla bağlanıldı.");

// Gerekli tabloları oluştur
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    priority TEXT,
    status TEXT DEFAULT 'todo',
    progress INTEGER DEFAULT 0,
    assignedTo TEXT,
    startDate TEXT,
    dueDate TEXT,
    createdBy INTEGER NOT NULL,
    FOREIGN KEY (createdBy) REFERENCES users(id)
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    taskId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    text TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id)
  )
`).run();

// Veritabanını diğer dosyalarda kullanılmak üzere global hale getir
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', (req, res, next) => { req.db = db; next(); }, authRoutes);

const authenticateToken = require('./middleware/auth');
app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({ message: `Hello ${req.user.role}, your ID is ${req.user.id}` });
});

const taskRoutes = require('./routes/tasks');
app.use('/api/tasks', (req, res, next) => { req.db = db; next(); }, taskRoutes);

const commentRoutes = require('./routes/comments');
app.use('/api/comments', (req, res, next) => { req.db = db; next(); }, commentRoutes);

const userRoutes = require('./routes/users');
app.use('/api/users', (req, res, next) => { req.db = db; next(); }, userRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
