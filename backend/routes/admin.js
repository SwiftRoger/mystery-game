const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// Get all stories
router.get('/stories', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM stories ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new story
router.post('/stories', auth, async (req, res) => {
  const { title, description } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO stories (title, description) VALUES ($1, $2) RETURNING *',
      [title, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a chapter to a story
router.post('/chapters', auth, async (req, res) => {
  const { story_id, chapter_number, title, content, win_condition, fail_condition } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO chapters 
        (story_id, chapter_number, title, content, win_condition, fail_condition) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [story_id, chapter_number, title, content, win_condition, fail_condition]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a chapter
router.put('/chapters/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { title, content, win_condition, fail_condition } = req.body;

  try {
    const result = await pool.query(
      `UPDATE chapters 
       SET title = $1, content = $2, win_condition = $3, fail_condition = $4 
       WHERE id = $5 
       RETURNING *`,
      [title, content, win_condition, fail_condition, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a chapter
router.delete('/chapters/:id', auth, async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM chapters WHERE id = $1', [id]);
    res.json({ message: 'Chapter deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a story
router.delete('/stories/:id', auth, async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM stories WHERE id = $1', [id]);
    res.json({ message: 'Story deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;