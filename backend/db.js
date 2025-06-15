const Database = require('better-sqlite3');
const db = new Database('taskmanager.db');

// Users tablosu
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL
  )
`).run();

// Tasks tablosu (assignedTo TEXT olarak kalıyor, virgülle ayrılmış kullanıcı ID'leri saklanabilir)
db.prepare(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    priority TEXT,
    status TEXT DEFAULT 'todo',
    progress INTEGER DEFAULT 0,
    assignedTo TEXT,           -- Virgülle ayrılmış userId listesi olarak
    startDate TEXT,
    dueDate TEXT,
    createdBy INTEGER NOT NULL,
    FOREIGN KEY (createdBy) REFERENCES users(id)
  )
`).run();
//     
// Comments tablosu
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

module.exports = db;
