const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

// Add comment to a task
router.post('/:taskId', auth, (req, res) => {
  const taskId = req.params.taskId;
  const userId = req.user.id;
  const { text } = req.body;

  if (!text) return res.status(400).json({ message: 'Text is required' });

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!task) return res.status(404).json({ message: 'Task not found' });

  db.prepare(`
    INSERT INTO comments (taskId, userId, text, createdAt)
    VALUES (?, ?, ?, datetime('now'))
  `).run(taskId, userId, text);

  res.status(201).json({ message: 'Comment added' });
});

// Get all comments for a task
router.get('/:taskId', auth, (req, res) => {
  const taskId = req.params.taskId;

  const comments = db.prepare(`
    SELECT c.id, c.taskId, c.userId, c.text, c.createdAt, 
           IFNULL(u.username, 'Unknown') AS username
    FROM comments c
    LEFT JOIN users u ON c.userId = u.id
    WHERE c.taskId = ?
    ORDER BY c.createdAt ASC
  `).all(taskId);

  res.json(comments);
});

// Update a comment
router.put('/:id', auth, (req, res) => {
  const commentId = req.params.id;
  const { text } = req.body;
  const userId = req.user.id;

  if (!text) return res.status(400).json({ message: 'Text is required' });

  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId);
  if (!comment) return res.status(404).json({ message: 'Comment not found' });

  if (comment.userId !== userId) {
    return res.status(403).json({ message: 'Not authorized to edit this comment' });
  }

  db.prepare(`
    UPDATE comments 
    SET text = ? 
    WHERE id = ?
  `).run(text, commentId);

  res.json({ message: 'Comment updated successfully' });
});

// Delete a comment
router.delete('/:id', auth, (req, res) => {
  const commentId = req.params.id;
  const userId = req.user.id;
  const role = req.user.role;

  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId);
  if (!comment) return res.status(404).json({ message: 'Comment not found' });

  if (role !== 'admin' && comment.userId !== userId) {
    return res.status(403).json({ message: 'Not authorized to delete this comment' });
  }

  db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);
  res.json({ message: 'Comment deleted successfully' });
});

module.exports = router;