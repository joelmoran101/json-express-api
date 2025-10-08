const jwt = require('jsonwebtoken');
const { createError } = require('./errorHandler');

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secure-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const COOKIE_NAME = 'authToken';

/**
 * Generate JWT token
 * @param {Object} payload - Data to encode in token
 * @returns {string} JWT token
 */
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'financial-data-tracker',
    audience: 'financial-data-tracker-users'
  });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET, {
    issuer: 'financial-data-tracker',
    audience: 'financial-data-tracker-users'
  });
};

/**
 * Set secure httpOnly cookie with JWT token
 * @param {Object} res - Express response object
 * @param {string} token - JWT token to set in cookie
 */
const setAuthCookie = (res, token) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true, // Prevents XSS attacks by making cookie inaccessible to JavaScript
    secure: isProduction, // Only send cookie over HTTPS in production
    sameSite: 'lax', // CSRF protection - prevents cross-site request forgery
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: '/' // Cookie available for all routes
  });
};

/**
 * Clear authentication cookie
 * @param {Object} res - Express response object
 */
const clearAuthCookie = (res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
};

/**
 * Authentication middleware - protects routes requiring authentication
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateToken = (req, res, next) => {
  try {
    // Get token from httpOnly cookie
    const token = req.cookies[COOKIE_NAME];
    
    if (!token) {
      throw createError(401, 'Authentication required - No token provided');
    }
    
    // Verify token
    const decoded = verifyToken(token);
    
    // Add user info to request object
    req.user = decoded;
    
    // Log authentication success in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔐 User authenticated: ${decoded.userId || decoded.email || 'Unknown'}`);
    }
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid authentication token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      // Clear the expired cookie
      clearAuthCookie(res);
      return res.status(401).json({
        success: false,
        error: 'Authentication token expired',
        action: 'login_required'
      });
    }
    
    // Handle other authentication errors
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Authentication failed'
    });
  }
};

/**
 * Optional authentication middleware - doesn't require authentication but adds user info if available
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const optionalAuth = (req, res, next) => {
  try {
    const token = req.cookies[COOKIE_NAME];
    
    if (token) {
      const decoded = verifyToken(token);
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // If token is invalid, just continue without user info
    // Don't block the request for optional auth
    next();
  }
};

/**
 * Demo login function - creates a demo user token
 * In a real application, this would verify credentials against a database
 * @param {string} username - Username (demo purposes)
 * @param {string} password - Password (demo purposes)
 * @returns {Object} User data and token
 */
const demoLogin = (username, password) => {
  // Demo users for testing - In production, verify against database
  const demoUsers = {
    'demo@example.com': {
      id: 'demo-user-123',
      email: 'demo@example.com',
      name: 'Demo User',
      role: 'user',
      password: 'demo123' // In production, use hashed passwords
    },
    'admin@example.com': {
      id: 'admin-user-456',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
      password: 'admin123'
    }
  };
  
  const user = demoUsers[username];
  if (!user || user.password !== password) {
    throw createError(401, 'Invalid credentials');
  }
  
  // Create JWT payload (don't include password)
  const payload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    iat: Math.floor(Date.now() / 1000) // Issued at timestamp
  };
  
  const token = generateToken(payload);
  
  return {
    user: payload,
    token
  };
};

module.exports = {
  generateToken,
  verifyToken,
  setAuthCookie,
  clearAuthCookie,
  authenticateToken,
  optionalAuth,
  demoLogin
};