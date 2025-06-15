// backend/index.js
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose(); // <== better-sqlite3 yerine
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// SQLite DB bağlantısı
const dbPath = path.resolve(__dirname, 'taskmanager.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Veritabanına bağlanırken hata oluştu:", err.message);
  } else {
    console.log("SQLite veritabanına başarıyla bağlanıldı.");
  }
});

// DB'yi global olarak erişilebilir yapmak için req içine koyabilirsin (opsiyonel)
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const authenticateToken = require('./middleware/auth');
app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({ message: `Hello ${req.user.role}, your ID is ${req.user.id}` });
});

const taskRoutes = require('./routes/tasks');
app.use('/api/tasks', taskRoutes);

const commentRoutes = require('./routes/comments');
app.use('/api/comments', commentRoutes);

const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
