// backend/index.js
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});