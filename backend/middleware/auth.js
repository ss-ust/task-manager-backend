// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

// Use environment variable for security
const SECRET_KEY = process.env.SECRET_KEY || 'taskmanager_secret_key';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: 'Missing Authorization header' });
  }

  const tokenParts = authHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    return res.status(401).json({ message: 'Invalid Authorization format' });
  }

  const token = tokenParts[1];

  jwt.verify(token, SECRET_KEY, (err, payload) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }

    // Validate payload (expect id, role, and optional username)
    if (!payload || typeof payload.id !== 'number' || typeof payload.role !== 'string') {
      return res.status(403).json({ message: 'Invalid token payload' });
    }

    // Debug logging (comment out in production)
    // console.log('[AUTH] User verified:', payload);

    req.user = {
      id: payload.id,
      role: payload.role,
      username: payload.username  // Include username if present in token
    };
    next();
  });
}

module.exports = authenticateToken;
