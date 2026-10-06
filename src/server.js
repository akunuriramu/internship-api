const express = require('express');
const internshipsRouter = require('./routes/internships');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON request bodies
app.use(express.json());

// Basic CORS headers to allow cross-origin API testing
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Root information endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to EdVyro Internship Board REST API',
    endpoints: {
      list: 'GET /api/internships?page=1&limit=5',
      detail: 'GET /api/internships/:id',
      create: 'POST /api/internships',
      update: 'PUT /api/internships/:id',
      delete: 'DELETE /api/internships/:id',
      health: 'GET /api/health'
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Mount internship routes
app.use('/api/internships', internshipsRouter);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Endpoint ${req.method} ${req.originalUrl} not found`
    }
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: {
      message: err.message || 'Internal server error'
    }
  });
});

let server;
if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(` EdVyro Internship API Server Running!`);
    console.log(` URL: http://localhost:${PORT}`);
    console.log(` Endpoint: http://localhost:${PORT}/api/internships`);
    console.log(`========================================`);
  });
}

module.exports = { app, server };
