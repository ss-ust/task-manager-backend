const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

const normalizeNullable = (value) => {
  if (typeof value === 'string' && value.trim() === '') return null;
  return value;
};

// Create Task
router.post('/', auth, (req, res) => {
  let {
    title,
    description,
    category,
    priority,
    status = 'todo',
    progress = 0,
    assignedTo = [],
    startDate = null,
    dueDate = null,
  } = req.body;

  if (!title || title.trim() === '') {
    return res.status(400).json({ message: 'Title is required' });
  }

  const createdBy = req.user.id;

  if (typeof assignedTo === 'string') {
    assignedTo = assignedTo.split(',').map(id => id.trim()).filter(Boolean);
  } else if (!Array.isArray(assignedTo)) {
    assignedTo = [];
  }

  if (assignedTo.length && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can assign tasks' });
  }

  description = normalizeNullable(description);
  category = normalizeNullable(category);
  startDate = normalizeNullable(startDate);
  dueDate = normalizeNullable(dueDate);

  for (const userId of assignedTo) {
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(400).json({ message: `Assigned user ${userId} does not exist` });
  }

  const assignedStr = assignedTo.length ? `,${assignedTo.join(',')},` : null;

  const result = db.prepare(`
    INSERT INTO tasks
      (title, description, category, priority, status, progress, assignedTo, startDate, dueDate, createdBy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title.trim(), description, category, priority, status, progress,
    assignedStr, startDate, dueDate, createdBy
  );

  res.status(201).json({ message: 'Task created successfully', taskId: result.lastInsertRowid });
});

// Update Task
router.put('/:id', auth, (req, res) => {
  const { id: userId, role } = req.user;
  const taskId = req.params.id;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!task) return res.status(404).json({ message: 'Task not found' });

  const taskAssignedTo = task.assignedTo ? task.assignedTo.split(',').filter(id => id) : [];
  const isAssignedUser = taskAssignedTo.includes(userId.toString());
  if (role !== 'admin' && task.createdBy !== userId && !isAssignedUser) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  let { title, description, category, priority, status, progress, assignedTo, startDate, dueDate } = req.body;
  description = normalizeNullable(description);
  category = normalizeNullable(category);
  startDate = normalizeNullable(startDate);
  dueDate = normalizeNullable(dueDate);

  let finalAssigned = task.assignedTo;
  if (role === 'admin' && assignedTo !== undefined) {
    const assignedArray = typeof assignedTo === 'string'
      ? assignedTo.split(',').map(id => id.trim()).filter(Boolean)
      : assignedTo;
    for (const uid of assignedArray) {
      const user = db.prepare('SELECT id FROM users WHERE id = ?').get(uid);
      if (!user) return res.status(400).json({ message: `Assigned user ${uid} does not exist` });
    }
    finalAssigned = assignedArray.length ? `,${assignedArray.join(',')},` : null;
  }

  db.prepare(`
    UPDATE tasks SET title=?, description=?, category=?, priority=?, status=?, progress=?, assignedTo=?, startDate=?, dueDate=?
    WHERE id=?
  `).run(
    title !== undefined ? title.trim() : task.title,
    description !== undefined ? description : task.description,
    category !== undefined ? category : task.category,
    priority !== undefined ? priority : task.priority,
    status !== undefined ? status : task.status,
    progress !== undefined ? progress : task.progress,
    finalAssigned,
    startDate !== undefined ? startDate : task.startDate,
    dueDate !== undefined ? dueDate : task.dueDate,
    taskId
  );

  res.json({ message: 'Task updated successfully' });
});

// Delete Task
router.delete('/:id', auth, (req, res) => {
  const { id: userId, role } = req.user;
  const taskId = req.params.id;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  if (role !== 'admin' && task.createdBy !== userId) {
    return res.status(403).json({ message: 'Not authorized' });
  }
  db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
  res.json({ message: 'Task deleted successfully' });
});

// List Tasks
router.get('/', auth, (req, res) => {
  const { id: userId, role } = req.user;
  const sql = `
    SELECT t.*, creator.username AS createdByUsername, GROUP_CONCAT(assignees.username) AS assignedUsernames
    FROM tasks t
    LEFT JOIN users creator ON creator.id = t.createdBy
    LEFT JOIN users assignees ON instr(',' || IFNULL(t.assignedTo, '') || ',', ',' || assignees.id || ',') > 0
    WHERE ${role === 'admin'
      ? '1=1'
      : '(t.createdBy = ? OR instr(\',\' || IFNULL(t.assignedTo, \'\') || \',\', \',\' || ? || \',\') > 0)'
    }
    GROUP BY t.id
    ORDER BY t.id DESC
  `;
  const params = role === 'admin' ? [] : [String(userId), String(userId)];
  const rows = db.prepare(sql).all(...params);
  const tasks = rows.map(t => ({
    id: t.id, title: t.title, description: t.description, category: t.category, priority: t.priority,
    status: t.status, progress: t.progress, startDate: t.startDate, dueDate: t.dueDate,
    createdBy: t.createdBy, createdByUsername: t.createdByUsername || 'Unknown',
    assignedUsernames: t.assignedUsernames ? t.assignedUsernames.split(',').map(s => s.trim()) : [],
    assignedUserIds: t.assignedTo ? t.assignedTo.split(',').filter(id => id).map(Number) : []
  }));
  res.json(tasks);
});

// Categories
router.get('/categories', auth, (req, res) => {
  const categories = db.prepare(`SELECT DISTINCT category FROM tasks WHERE category IS NOT NULL AND category != ''`).all();
  res.json(categories.map(c => c.category));
});

// Comments routes (inside tasks.js)

// Add comment to a task
router.post('/comments/:taskId', auth, (req, res) => {
  const { id: userId, role } = req.user;
  const taskId = req.params.taskId;
  const { text } = req.body;

  if (!text || text.trim() === '') return res.status(400).json({ message: 'Comment cannot be empty' });

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!task) return res.status(404).json({ message: 'Task not found' });

  const assignedUsers = (task.assignedTo || '').split(',').filter(Boolean);
  const isAssignedUser = assignedUsers.includes(String(userId));

  db.prepare(`INSERT INTO comments (taskId, userId, text, createdAt) VALUES (?, ?, ?, datetime('now'))`)
    .run(taskId, userId, text.trim());

  res.json({ message: 'Comment added' });
});

// Get all comments for a task
router.get('/comments/:taskId', auth, (req, res) => {
  const taskId = req.params.taskId;
  const comments = db.prepare(`
    SELECT c.id, c.text, c.userId, u.username, c.createdAt
    FROM comments c
    JOIN users u ON u.id = c.userId
    WHERE c.taskId = ?
    ORDER BY c.createdAt DESC
  `).all(taskId);
  res.json(comments);
});

// Update a comment
router.put('/comments/:commentId', auth, (req, res) => {
  const { id: userId, role } = req.user;
  const commentId = req.params.commentId;
  const { text } = req.body;
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId);
  if (!comment) return res.status(404).json({ message: 'Comment not found' });
  if (role !== 'admin' && comment.userId !== userId) {
    return res.status(403).json({ message: 'Not authorized to edit this comment' });
  }
  if (!text || text.trim() === '') return res.status(400).json({ message: 'Comment cannot be empty' });
  db.prepare(`UPDATE comments SET text = ? WHERE id = ?`).run(text.trim(), commentId);
  res.json({ message: 'Comment updated' });
});

// Delete a comment
router.delete('/comments/:commentId', auth, (req, res) => {
  const { id: userId, role } = req.user;
  const commentId = req.params.commentId;
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId);
  if (!comment) return res.status(404).json({ message: 'Comment not found' });
  if (role !== 'admin' && comment.userId !== userId) {
    return res.status(403).json({ message: 'Not authorized to delete this comment' });
  }
  db.prepare(`DELETE FROM comments WHERE id = ?`).run(commentId);
  res.json({ message: 'Comment deleted' });
});

module.exports = router;
