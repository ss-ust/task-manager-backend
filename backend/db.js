// db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'taskmanager.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Veritabanı bağlantı hatası:", err.message);
  } else {
    console.log("SQLite veritabanına bağlanıldı.");
    createTables();
  }
});

function createTables() {
  // Users tablosu
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL
    )
  `);

  // Tasks tablosu
  db.run(`
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
  `);

  // Comments tablosu
  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      taskId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      text TEXT NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);
}

module.exports = db;
