const { body, param, query, validationResult } = require('express-validator');
const mongoSanitize = require('express-mongo-sanitize');

/**
 * Handle validation errors middleware
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

/**
 * Data sanitization middleware
 */
const sanitizeInput = [
  mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      console.warn(`Sanitized key ${key} in request`);
    },
  })
];

/**
 * Plotly data validation helper
 */
const isValidPlotlyData = (data) => {
  return data && 
    typeof data === 'object' && 
    (data.data || data.layout) && // Must have at least data or layout
    Array.isArray(data.data || []);
};

/**
 * Chart creation validation rules
 */
const validateCreateChart = [
  body('plotlyData')
    .exists()
    .withMessage('Plotly data is required')
    .custom((value) => {
      if (!isValidPlotlyData(value)) {
        throw new Error('Invalid Plotly data format. Must include data array or layout object.');
      }
      return true;
    })
    .customSanitizer((value) => {
      // Remove any potentially harmful properties
      if (value && typeof value === 'object') {
        delete value.__proto__;
        delete value.constructor;
      }
      return value;
    }),
    
  body('chartTitle')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Chart title must be between 1 and 200 characters')
    .trim()
    .escape(),
    
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters')
    .trim()
    .escape(),
    
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Tags must be an array with maximum 10 items'),
    
  body('tags.*')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters')
    .trim()
    .escape(),
    
  handleValidationErrors
];

/**
 * Chart update validation rules
 */
const validateUpdateChart = [
  param('id')
    .isMongoId()
    .withMessage('Invalid chart ID format'),
    
  body('plotlyData')
    .optional()
    .custom((value) => {
      if (value && !isValidPlotlyData(value)) {
        throw new Error('Invalid Plotly data format. Must include data array or layout object.');
      }
      return true;
    })
    .customSanitizer((value) => {
      if (value && typeof value === 'object') {
        delete value.__proto__;
        delete value.constructor;
      }
      return value;
    }),
    
  body('chartTitle')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Chart title must be between 1 and 200 characters')
    .trim()
    .escape(),
    
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters')
    .trim()
    .escape(),
    
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Tags must be an array with maximum 10 items'),
    
  body('tags.*')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters')
    .trim()
    .escape(),
    
  handleValidationErrors
];

/**
 * Chart ID validation rules
 */
const validateChartId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid chart ID format'),
    
  handleValidationErrors
];

/**
 * Pagination validation rules
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be a positive integer between 1 and 1000')
    .toInt(),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be a positive integer between 1 and 100')
    .toInt(),
    
  query('sort')
    .optional()
    .isIn(['createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'chartTitle', '-chartTitle'])
    .withMessage('Sort must be one of: createdAt, -createdAt, updatedAt, -updatedAt, chartTitle, -chartTitle'),
    
  handleValidationErrors
];

/**
 * Request size validation middleware
 */
const validateRequestSize = (maxSize = '2mb') => {
  return (req, res, next) => {
    const contentLength = req.get('Content-Length');
    const maxSizeBytes = parseSize(maxSize);
    
    if (contentLength && parseInt(contentLength) > maxSizeBytes) {
      return res.status(413).json({
        error: 'Request too large',
        message: `Request size exceeds maximum allowed size of ${maxSize}`,
        received: contentLength,
        maximum: maxSizeBytes
      });
    }
    
    next();
  };
};

/**
 * Helper function to parse size strings like '2mb' to bytes
 */
const parseSize = (size) => {
  const units = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };
  
  const match = size.toString().toLowerCase().match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb)$/);
  if (!match) return 0;
  
  return parseFloat(match[1]) * units[match[2]];
};

/**
 * Content type validation middleware
 */
const validateContentType = (allowedTypes = ['application/json']) => {
  return (req, res, next) => {
    const contentType = req.get('Content-Type');
    
    if (req.method !== 'GET' && req.method !== 'DELETE') {
      if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
        return res.status(415).json({
          error: 'Unsupported Media Type',
          message: `Content-Type must be one of: ${allowedTypes.join(', ')}`,
          received: contentType || 'none'
        });
      }
    }
    
    next();
  };
};

module.exports = {
  handleValidationErrors,
  sanitizeInput,
  validateCreateChart,
  validateUpdateChart,
  validateChartId,
  validatePagination,
  validateRequestSize,
  validateContentType,
  isValidPlotlyData
};