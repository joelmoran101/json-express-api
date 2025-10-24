const crypto = require('crypto');

/**
 * CSRF Token Validation Middleware
 * 
 * Implements double-submit cookie pattern for CSRF protection
 * https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie
 */

/**
 * Validate CSRF token for state-changing requests
 */
const validateCSRF = (req, res, next) => {
  // Skip CSRF validation for safe HTTP methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Get tokens from cookie and header
  const cookieToken = req.cookies['XSRF-TOKEN'];
  const headerToken = req.headers['x-csrf-token'];
  
  // Validate tokens exist and match
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({
      success: false,
      error: 'Invalid CSRF token',
      message: 'CSRF token validation failed. Please refresh and try again.',
      code: 'CSRF_VALIDATION_FAILED'
    });
  }
  
  // Tokens match - allow request to proceed
  next();
};

/**
 * Generate and set a new CSRF token
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {string} - Generated CSRF token
 */
const generateCSRFToken = (req, res) => {
  // Generate cryptographically secure random token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Set cookie with appropriate security settings
  res.cookie('XSRF-TOKEN', token, {
    httpOnly: false, // Must be readable by JavaScript for double-submit pattern
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'lax', // Provides good CSRF protection
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/' // Available across entire site
  });
  
  return token;
};

/**
 * CSRF token endpoint handler
 * 
 * Provides an endpoint for clients to request a fresh CSRF token
 */
const csrfTokenHandler = (req, res) => {
  const token = generateCSRFToken(req, res);
  
  res.json({ 
    success: true,
    message: 'CSRF token generated successfully',
    data: {
      token, // Also send in response body for convenience
      expiresIn: '24h'
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  });
};

/**
 * Middleware to automatically generate CSRF token on first GET request
 * if one doesn't exist
 */
const autoGenerateCSRF = (req, res, next) => {
  // Only generate for GET requests if no token exists
  if (req.method === 'GET' && !req.cookies['XSRF-TOKEN']) {
    generateCSRFToken(req, res);
  }
  next();
};

module.exports = {
  validateCSRF,
  generateCSRFToken,
  csrfTokenHandler,
  autoGenerateCSRF
};