const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// Register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Check if user exists
    const exists = await pool.query(
      'SELECT id FROM players WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({ message: 'Username or email already taken' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create player
    const result = await pool.query(
      'INSERT INTO players (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, password_hash]
    );

    const player = result.rows[0];

    // Generate token
    const token = jwt.sign(
      { id: player.id, username: player.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, player });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find player
    const result = await pool.query(
      'SELECT * FROM players WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const player = result.rows[0];

    // Check password
    const valid = await bcrypt.compare(password, player.password_hash);
    if (!valid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update last login
    await pool.query(
      'UPDATE players SET created_at = created_at WHERE id = $1',
      [player.id]
    );

    // Generate token
    const token = jwt.sign(
      { id: player.id, username: player.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      player: {
        id: player.id,
        username: player.username,
        email: player.email
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;