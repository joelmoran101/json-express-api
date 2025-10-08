const express = require('express');
const { body, validationResult } = require('express-validator');
const { 
  demoLogin, 
  setAuthCookie, 
  clearAuthCookie, 
  authenticateToken, 
  optionalAuth 
} = require('../middleware/auth');
const { asyncHandler, createError } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * @route   POST /api/auth/login
 * @desc    Login user and set httpOnly cookie
 * @access  Public
 */
router.post('/login',
  // Input validation
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .isLength({ min: 1 })
      .withMessage('Password is required')
      .trim()
  ],
  
  asyncHandler(async (req, res) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input data',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    try {
      // Perform demo login (in production, verify against database)
      const { user, token } = demoLogin(email, password);

      // Set secure httpOnly cookie
      setAuthCookie(res, token);

      // Return user data (without token - it's in httpOnly cookie)
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.userId,
            email: user.email,
            name: user.name,
            role: user.role
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          authMethod: 'httpOnly-cookie'
        }
      });

      // Log successful login in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔐 Login successful: ${user.email}`);
      }

    } catch (error) {
      // Handle authentication errors
      const statusCode = error.statusCode || 401;
      res.status(statusCode).json({
        success: false,
        error: error.message || 'Authentication failed',
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    }
  })
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and clear httpOnly cookie
 * @access  Private
 */
router.post('/logout',
  optionalAuth, // Allow logout even with invalid token
  asyncHandler(async (req, res) => {
    // Clear the authentication cookie
    clearAuthCookie(res);

    res.json({
      success: true,
      message: 'Logout successful',
      data: {
        loggedOut: true
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });

    // Log successful logout in development
    if (process.env.NODE_ENV === 'development' && req.user) {
      console.log(`🔓 Logout successful: ${req.user.email}`);
    }
  })
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user information
 * @access  Private
 */
router.get('/me',
  authenticateToken,
  asyncHandler(async (req, res) => {
    // Return current user information from JWT token
    res.json({
      success: true,
      data: {
        user: {
          id: req.user.userId,
          email: req.user.email,
          name: req.user.name,
          role: req.user.role
        },
        authenticated: true,
        tokenIssuedAt: new Date(req.user.iat * 1000).toISOString()
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  })
);

/**
 * @route   GET /api/auth/status
 * @desc    Check authentication status (optional auth)
 * @access  Public
 */
router.get('/status',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const isAuthenticated = !!req.user;
    
    res.json({
      success: true,
      data: {
        authenticated: isAuthenticated,
        user: isAuthenticated ? {
          id: req.user.userId,
          email: req.user.email,
          name: req.user.name,
          role: req.user.role
        } : null
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  })
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh authentication token (extend session)
 * @access  Private
 */
router.post('/refresh',
  authenticateToken,
  asyncHandler(async (req, res) => {
    // Generate new token with current user data
    const { generateToken } = require('../middleware/auth');
    
    const newPayload = {
      userId: req.user.userId,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      iat: Math.floor(Date.now() / 1000)
    };
    
    const newToken = generateToken(newPayload);
    
    // Set new cookie
    setAuthCookie(res, newToken);
    
    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        user: {
          id: req.user.userId,
          email: req.user.email,
          name: req.user.name,
          role: req.user.role
        },
        tokenRefreshed: true
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  })
);

/**
 * @route   GET /api/auth/demo-users
 * @desc    Get list of demo users for testing (development only)
 * @access  Public
 */
router.get('/demo-users',
  asyncHandler(async (req, res) => {
    // Only show demo users in development
    if (process.env.NODE_ENV !== 'development') {
      throw createError(404, 'Not found');
    }

    res.json({
      success: true,
      message: 'Demo users for testing',
      data: {
        users: [
          {
            email: 'demo@example.com',
            password: 'demo123',
            role: 'user',
            name: 'Demo User'
          },
          {
            email: 'admin@example.com',
            password: 'admin123',
            role: 'admin',
            name: 'Admin User'
          }
        ]
      },
      meta: {
        timestamp: new Date().toISOString(),
        warning: 'This endpoint is only available in development mode'
      }
    });
  })
);

module.exports = router;