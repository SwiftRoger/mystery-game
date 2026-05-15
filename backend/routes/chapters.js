const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// Get all chapters for a story
router.get('/:storyId', auth, async (req, res) => {
  const { storyId } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM chapters WHERE story_id = $1 ORDER BY chapter_number ASC',
      [storyId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single chapter
router.get('/:storyId/:chapterNumber', auth, async (req, res) => {
  const { storyId, chapterNumber } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM chapters WHERE story_id = $1 AND chapter_number = $2',
      [storyId, chapterNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    // Only send content, never expose win/fail conditions to frontend
    const chapter = result.rows[0];
    res.json({
      id: chapter.id,
      chapter_number: chapter.chapter_number,
      title: chapter.title,
      content: chapter.content
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;