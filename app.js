// Load environment variables first
require('dotenv').config();

// Handle uncaught exceptions and unhandled rejections
const { 
  handleUncaughtException, 
  handleUnhandledRejection,
  gracefulShutdown 
} = require('./middleware/errorHandler');

handleUncaughtException();
handleUnhandledRejection();

// Import required modules
const express = require('express');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/database');

// Import middleware
const { 
  securityHeaders, 
  generalLimiter, 
  corsConfig 
} = require('./middleware/security');
const { sanitizeInput } = require('./middleware/validation');
const { 
  notFoundHandler, 
  globalErrorHandler 
} = require('./middleware/errorHandler');
const { 
  validateCSRF, 
  csrfTokenHandler,
  autoGenerateCSRF 
} = require('./middleware/csrf');

// Import routes
const chartRoutes = require('./routes/charts');
const authRoutes = require('./routes/auth');

// Create Express application
const app = express();

// Define the port number
const port = process.env.PORT || 3001;

// Connect to MongoDB
connectDB();

// =============================================================================
// SECURITY MIDDLEWARE
// =============================================================================

// Trust proxy (important for rate limiting and IP detection behind reverse proxy)
app.set('trust proxy', 1);

// Security headers
app.use(securityHeaders);

// Rate limiting
app.use(generalLimiter);

// CORS configuration
app.use(corsConfig);

// =============================================================================
// BODY PARSING MIDDLEWARE
// =============================================================================

// Body parsing middleware with security-focused size limits
app.use(express.json({ 
  limit: '2mb', // Reduced from 10mb for security
  type: 'application/json',
  verify: (req, res, buf) => {
    // Store raw body for signature verification if needed
    req.rawBody = buf.toString();
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '1mb',
  type: 'application/x-www-form-urlencoded'
}));

// =============================================================================
// DATA SANITIZATION MIDDLEWARE
// =============================================================================

// Data sanitization against NoSQL query injection
app.use(sanitizeInput);

// Cookie parsing middleware (must be after body parsers)
app.use(cookieParser());

// =============================================================================
// CSRF PROTECTION
// =============================================================================

// Automatically generate CSRF token on first GET request
app.use(autoGenerateCSRF);

// CSRF token endpoint - clients can request a fresh token
app.get('/api/csrf-token', csrfTokenHandler);

// Apply CSRF validation to all API routes (except GET/HEAD/OPTIONS)
app.use('/api', validateCSRF);

// =============================================================================
// ROUTES
// =============================================================================

// Basic health check route
app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: 'Plotly Chart API Server is running!',
    data: {
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      endpoints: {
        'GET /': 'API health check and information',
        'GET /api/csrf-token': 'Get CSRF token for secure requests',
        'GET /api/charts': 'Get all charts (with pagination)',
        'GET /api/charts/:id': 'Get a specific chart by ID',
        'GET /api/charts/:id/stats': 'Get chart statistics',
        'POST /api/charts': 'Upload a new Plotly chart (requires CSRF token)',
        'POST /api/charts/:id/duplicate': 'Duplicate an existing chart (requires CSRF token)',
        'PUT /api/charts/:id': 'Update a specific chart (requires CSRF token)',
        'DELETE /api/charts/:id': 'Delete a specific chart (requires CSRF token)',
        'POST /api/auth/login': 'Login with email and password (requires CSRF token)',
        'POST /api/auth/logout': 'Logout and clear authentication cookie (requires CSRF token)',
        'GET /api/auth/me': 'Get current user information',
        'GET /api/auth/status': 'Check authentication status'
      }
    },
    meta: {
      server: 'Express.js',
      database: 'MongoDB',
      security: 'Enhanced',
      rateLimit: 'Active',
      cors: 'Configured'
    }
  });
});

// API routes
app.use('/api/charts', chartRoutes);
app.use('/api/auth', authRoutes);

// Health check endpoint for monitoring
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0'
  });
});

// API documentation endpoint (basic)
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Plotly Chart API Documentation',
    data: {
      version: '1.0.0',
      baseUrl: `${req.protocol}://${req.get('host')}`,
      endpoints: [
        {
          method: 'GET',
          path: '/api/charts',
          description: 'Get all charts with pagination',
          parameters: {
            page: 'Page number (default: 1)',
            limit: 'Items per page (default: 10, max: 100)',
            sort: 'Sort field (createdAt, updatedAt, chartTitle)',
            search: 'Search in title, description, and tags'
          }
        },
        {
          method: 'GET',
          path: '/api/charts/:id',
          description: 'Get a specific chart by ID',
          parameters: {
            id: 'Chart ID (MongoDB ObjectId)'
          }
        },
        {
          method: 'POST',
          path: '/api/charts',
          description: 'Create a new chart',
          body: {
            plotlyData: 'Required. Plotly chart configuration object',
            chartTitle: 'Optional. Chart title (max 200 chars)',
            description: 'Optional. Chart description (max 1000 chars)',
            tags: 'Optional. Array of tags (max 10 items, 50 chars each)'
          }
        },
        {
          method: 'PUT',
          path: '/api/charts/:id',
          description: 'Update an existing chart',
          parameters: {
            id: 'Chart ID (MongoDB ObjectId)'
          }
        },
        {
          method: 'DELETE',
          path: '/api/charts/:id',
          description: 'Delete a chart',
          parameters: {
            id: 'Chart ID (MongoDB ObjectId)'
          }
        }
      ]
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  });
});

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(globalErrorHandler);

// =============================================================================
// START SERVER
// =============================================================================

const server = app.listen(port, () => {
  console.log('🚀 Server started successfully!');
  console.log(`📡 Listening on: http://localhost:${port}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
  console.log(`🔒 Security: Enhanced with helmet, rate limiting, and input validation`);
  console.log(`🛡️  Rate limits: 100 requests/15min general, 20 writes/15min`);
  console.log('\\n📋 Available endpoints:');
  console.log('   GET  / - API information and health check');
  console.log('   GET  /health - Server health status');
  console.log('   GET  /api - API documentation');
  console.log('   GET  /api/charts - Get all charts (paginated)');
  console.log('   GET  /api/charts/:id - Get specific chart');
  console.log('   GET  /api/charts/:id/stats - Get chart statistics');
  console.log('   POST /api/charts - Upload new chart');
  console.log('   POST /api/charts/:id/duplicate - Duplicate chart');
  console.log('   PUT  /api/charts/:id - Update chart');
  console.log('   DELETE /api/charts/:id - Delete chart');
  console.log('\\n📚 Ready to accept secure Plotly chart data!');
  console.log('🔐 Security features active: Input validation, rate limiting, CORS protection');
});

// Setup graceful shutdown
gracefulShutdown(server);