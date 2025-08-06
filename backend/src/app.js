const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const apifyRoutes = require('./routes/apify');

const app = express();

// Middleware
app.use(helmet());
// Update your backend/src/app.js CORS configuration

app.use(cors({
  origin: [
    'http://localhost:5173', 
    'https://entrepreneur-opc.vercel.app', 
    /\.vercel\.app$/ // Any vercel deployment
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-apify-token']
}));
app.use(morgan('combined'));
app.use(express.json());

// Routes
app.use('/api/apify', apifyRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

module.exports = app;