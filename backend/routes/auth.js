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
    // Önce kullanıcı var mı kontrol et
    db.get('SELECT id FROM users WHERE username = ?', [trimmedUsername], async (err, row) => {
      if (err) {
        console.error('[DB Check Error]', err);
        return res.status(500).json({ message: 'Internal error during user check' });
      }

      if (row) {
        return res.status(409).json({ message: 'Username already exists' });
      }

      // Kullanıcı yoksa şifreyi hashle ve ekle
      const hashedPassword = await bcrypt.hash(password, 10);
      db.run(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        [trimmedUsername, hashedPassword, trimmedRole],
        function (insertErr) {
          if (insertErr) {
            console.error('[Register Insert Error]', insertErr);
            return res.status(500).json({ message: 'Registration failed' });
          }
          return res.status(201).json({ message: 'User registered successfully' });
        }
      );
    });
  } catch (err) {
    console.error('[Register Error]', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ✅ LOGIN (aynı)
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      console.error('[Login DB Error]', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.password) {
      return res.status(500).json({ message: 'User has no password set' });
    }

    try {
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, role: user.role, username: user.username },
        SECRET_KEY,
        { expiresIn: '1d' }
      );

      return res.json({
        token,
        id: user.id,
        username: user.username,
        role: user.role
      });
    } catch (err) {
      console.error('[Login Hash Error]', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
});

module.exports = router;
