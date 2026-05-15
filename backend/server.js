const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const chapterRoutes = require('./routes/chapters');
const adminRoutes = require('./routes/admin');

app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Nebula Noir API running 🖤' });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});