// backend/routes/auth.js

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();

const SECRET_KEY = process.env.SECRET_KEY || 'taskmanager_secret_key';

// ✅ REGISTER
router.post('/register', async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  const trimmedUsername = username.trim();
  const trimmedRole = role.trim();

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const stmt = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
    stmt.run(trimmedUsername, hashedPassword, trimmedRole);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ message: 'Username already exists' });
    }
    console.error('[Register Error]', err);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// ✅ LOGIN
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    const user = stmt.get(username);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.password) {
      return res.status(500).json({ message: 'User has no password set' });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, username: user.username },
      SECRET_KEY,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      id: user.id,
      username: user.username,
      role: user.role
    });
  } catch (err) {
    console.error('[Login Error]', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
