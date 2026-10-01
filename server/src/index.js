require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 4000;

// Restrict CORS to the deployed front end when CORS_ORIGIN is set. Falling back
// to a wildcard keeps local development frictionless.
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(
  cors(
    allowedOrigins.length > 0
      ? { origin: allowedOrigins, credentials: false }
      : {}
  )
);
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/meetings', require('./routes/meetings'));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start();
