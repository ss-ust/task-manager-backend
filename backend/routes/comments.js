const express = require('express');
const db = require('../db'); // sqlite3 bağlantısı burada tanımlı olmalı
const auth = require('../middleware/auth');
const router = express.Router();

// Add comment to a task
router.post('/:taskId', auth, async (req, res) => {
  const taskId = req.params.taskId;
  const userId = req.user.id;
  const { text } = req.body;

  if (!text) return res.status(400).json({ message: 'Text is required' });

  db.get('SELECT * FROM tasks WHERE id = ?', [taskId], (err, task) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    db.run(
      `INSERT INTO comments (taskId, userId, text, createdAt)
       VALUES (?, ?, ?, datetime('now'))`,
      [taskId, userId, text],
      function (err) {
        if (err) return res.status(500).json({ message: 'Insert failed' });
        res.status(201).json({ message: 'Comment added', id: this.lastID });
      }
    );
  });
});

// Get all comments for a task
router.get('/:taskId', auth, async (req, res) => {
  const taskId = req.params.taskId;

  db.all(
    `
    SELECT c.id, c.taskId, c.userId, c.text, c.createdAt, 
           IFNULL(u.username, 'Unknown') AS username
    FROM comments c
    LEFT JOIN users u ON c.userId = u.id
    WHERE c.taskId = ?
    ORDER BY c.createdAt ASC
    `,
    [taskId],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'Query failed' });
      res.json(rows);
    }
  );
});

// Update a comment
router.put('/:id', auth, async (req, res) => {
  const commentId = req.params.id;
  const { text } = req.body;
  const userId = req.user.id;

  if (!text) return res.status(400).json({ message: 'Text is required' });

  db.get('SELECT * FROM comments WHERE id = ?', [commentId], (err, comment) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    if (comment.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to edit this comment' });
    }

    db.run(
      'UPDATE comments SET text = ? WHERE id = ?',
      [text, commentId],
      function (err) {
        if (err) return res.status(500).json({ message: 'Update failed' });
        res.json({ message: 'Comment updated successfully' });
      }
    );
  });
});

// Delete a comment
router.delete('/:id', auth, async (req, res) => {
  const commentId = req.params.id;
  const userId = req.user.id;
  const role = req.user.role;

  db.get('SELECT * FROM comments WHERE id = ?', [commentId], (err, comment) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    if (role !== 'admin' && comment.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    db.run('DELETE FROM comments WHERE id = ?', [commentId], function (err) {
      if (err) return res.status(500).json({ message: 'Delete failed' });
      res.json({ message: 'Comment deleted successfully' });
    });
  });
});

module.exports = router;
