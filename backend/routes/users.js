// backend/routes/users.js
const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can view all users' });
  }

  const users = db.prepare('SELECT id, username, role FROM users').all();
  res.json(users);
});

module.exports = router;
