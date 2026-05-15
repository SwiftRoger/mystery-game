const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected client error', err);
});

pool.connect()
  .then(client => {
    console.log('Connected to Neon database 🖤');
    client.release();
  })
  .catch(err => console.error('Database connection error:', err));

module.exports = pool;