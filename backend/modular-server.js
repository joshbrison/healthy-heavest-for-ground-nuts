// Modular server entry point for backend best practices
// Adhere to modularity and reusability

const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const apiRouter = require('./routes/api');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Serve static frontend (HTML/CSS/JS) from repo root so pages can call same-origin `/api/*`
app.use(express.static(path.join(__dirname, '..')));

// API routes
app.use('/api', apiRouter);

// Error handling middleware
app.use(errorHandler);

module.exports = app;
