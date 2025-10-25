const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

/**
 * Security Headers Middleware
 * Configures helmet with appropriate security headers
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'", "http://localhost:*", "http://127.0.0.1:*"],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      childSrc: ["'self'"],
      frameSrc: ["'none'"],
      workerSrc: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      manifestSrc: ["'self'"]
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for API usage
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
});

/**
 * General Rate Limiter
 * Applies to all endpoints
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

/**
 * Strict Rate Limiter for Write Operations
 * Applies to POST, PUT, DELETE operations
 */
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 write requests per windowMs
  message: {
    error: 'Too many write operations from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  skip: (req) => !['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method),
  handler: (req, res) => {
    res.status(429).json({
      error: 'Write operation rate limit exceeded',
      message: 'Too many write operations from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

/**
 * CORS Configuration
 * Secure cross-origin resource sharing setup
 */
const corsConfig = cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.CORS_ORIGIN ? 
      process.env.CORS_ORIGIN.split(',').map(url => url.trim()) : 
      ['http://localhost:3000', 'http://127.0.0.1:3000'];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Time', 'X-CSRF-Token'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // 24 hours
});

/**
 * API Key Validation Middleware (Optional)
 * Uncomment and configure if you want to add API key authentication
 */
const validateApiKey = (req, res, next) => {
  // Skip API key validation in development
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const validApiKey = process.env.API_KEY;

  if (!validApiKey) {
    // If no API key is configured, skip validation
    return next();
  }

  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid API key required'
    });
  }

  next();
};

module.exports = {
  securityHeaders,
  generalLimiter,
  strictLimiter,
  corsConfig,
  validateApiKey
};