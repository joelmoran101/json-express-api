/**
 * Custom error class for API errors
 */
class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Create a new API error
 */
const createError = (statusCode, message, isOperational = true) => {
  return new ApiError(statusCode, message, isOperational);
};

/**
 * Send error response in development mode
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode || 500).json({
    error: {
      status: 'error',
      statusCode: err.statusCode || 500,
      message: err.message,
      stack: err.stack,
      timestamp: err.timestamp || new Date().toISOString(),
      ...(err.name && { name: err.name }),
      ...(err.code && { code: err.code })
    }
  });
};

/**
 * Send error response in production mode
 */
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode || 500).json({
      error: {
        status: 'error',
        statusCode: err.statusCode || 500,
        message: err.message,
        timestamp: err.timestamp || new Date().toISOString()
      }
    });
  } 
  // Programming or other unknown error: don't leak error details
  else {
    // Log error for debugging
    console.error('ERROR:', err);
    
    res.status(500).json({
      error: {
        status: 'error',
        statusCode: 500,
        message: 'Something went wrong. Please try again later.',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Handle MongoDB cast errors (invalid ObjectId)
 */
const handleCastError = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return createError(400, message);
};

/**
 * Handle MongoDB duplicate key errors
 */
const handleDuplicateKeyError = (err) => {
  const value = err.errmsg ? err.errmsg.match(/(["'])(\\?.)*?\1/) : null;
  const message = `Duplicate field value: ${value ? value[0] : 'unknown'}. Please use another value.`;
  return createError(400, message);
};

/**
 * Handle MongoDB validation errors
 */
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map(val => val.message);
  const message = `Invalid input data: ${errors.join('. ')}`;
  return createError(400, message);
};

/**
 * Handle JWT errors
 */
const handleJWTError = () => {
  return createError(401, 'Invalid token. Please log in again.');
};

/**
 * Handle JWT expired errors
 */
const handleJWTExpiredError = () => {
  return createError(401, 'Your token has expired. Please log in again.');
};

/**
 * Handle request size limit errors
 */
const handleRequestSizeError = (err) => {
  const message = 'Request entity too large. Please reduce the size of your request.';
  return createError(413, message);
};

/**
 * Handle JSON syntax errors
 */
const handleSyntaxError = (err) => {
  if (err.type === 'entity.parse.failed') {
    return createError(400, 'Invalid JSON format in request body.');
  }
  return createError(400, 'Malformed request data.');
};

/**
 * Handle CORS errors
 */
const handleCORSError = (err) => {
  return createError(403, 'CORS policy violation. Origin not allowed.');
};

/**
 * Handle rate limit errors
 */
const handleRateLimitError = (err) => {
  return createError(429, 'Too many requests. Please try again later.');
};

/**
 * 404 handler middleware
 */
const notFoundHandler = (req, res, next) => {
  const error = createError(404, `Endpoint not found: ${req.method} ${req.originalUrl}`);
  next(error);
};

/**
 * Global error handling middleware
 */
const globalErrorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;
  error.isOperational = err.isOperational !== undefined ? err.isOperational : false;

  // Log error for debugging (in all environments)
  const errorLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    error: {
      name: err.name,
      message: err.message,
      statusCode: err.statusCode || 500,
      stack: process.env.NODE_ENV === 'development' ? err.stack : 'Stack trace hidden in production'
    }
  };
  console.error('Global Error Handler:', JSON.stringify(errorLog, null, 2));

  // Handle specific error types
  if (err.name === 'CastError') {
    error = handleCastError(error);
  } else if (err.code === 11000) {
    error = handleDuplicateKeyError(error);
  } else if (err.name === 'ValidationError') {
    error = handleValidationError(error);
  } else if (err.name === 'JsonWebTokenError') {
    error = handleJWTError();
  } else if (err.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  } else if (err.type === 'entity.too.large') {
    error = handleRequestSizeError(error);
  } else if (err.type === 'entity.parse.failed' || err.name === 'SyntaxError') {
    error = handleSyntaxError(error);
  } else if (err.message && err.message.includes('CORS')) {
    error = handleCORSError(error);
  } else if (err.statusCode === 429) {
    error = handleRateLimitError(error);
  }

  // Send appropriate error response
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

/**
 * Async error handler wrapper
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = (server) => {
  const shutdown = (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    
    server.close((err) => {
      if (err) {
        console.error('Error during server shutdown:', err);
        process.exit(1);
      }
      
      console.log('Server closed. Exiting process...');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

/**
 * Unhandled rejection handler
 */
const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (err, promise) => {
    console.error('Unhandled Promise Rejection:', err);
    console.error('Promise:', promise);
    
    // Exit process with failure
    process.exit(1);
  });
};

/**
 * Uncaught exception handler
 */
const handleUncaughtException = () => {
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    console.error('Stack:', err.stack);
    
    // Exit process immediately
    process.exit(1);
  });
};

module.exports = {
  ApiError,
  createError,
  notFoundHandler,
  globalErrorHandler,
  asyncHandler,
  gracefulShutdown,
  handleUnhandledRejection,
  handleUncaughtException
};