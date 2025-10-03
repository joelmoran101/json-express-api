// Load environment variables
require('dotenv').config();

// Import required modules
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const Chart = require('./chartModel');

// Create an Express application
const app = express();

// Define the port number
const port = process.env.PORT || 3001;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Middleware to parse incoming JSON requests (with larger limit for Plotly data)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Basic route for the root URL
app.get('/', (req, res) => {
  res.json({ 
    message: 'Plotly Chart API Server is running!',
    version: '1.0.0',
    endpoints: {
      'GET /': 'This endpoint',
      'POST /api/charts': 'Upload a new Plotly chart',
      'GET /api/charts': 'Get all charts',
      'GET /api/charts/:id': 'Get a specific chart by ID',
      'PUT /api/charts/:id': 'Update a specific chart',
      'DELETE /api/charts/:id': 'Delete a specific chart'
    }
  });
});

// Validation function for Plotly data
const isValidPlotlyData = (data) => {
  return data && 
    typeof data === 'object' && 
    (data.data || data.layout) && // Must have at least data or layout
    Array.isArray(data.data || []);
};

// =============================================================================
// CHART API ENDPOINTS
// =============================================================================

// POST /api/charts - Create a new chart
app.post('/api/charts', async (req, res) => {
  try {
    // Validate the incoming Plotly data
    if (!isValidPlotlyData(req.body)) {
      return res.status(400).json({ 
        error: 'Invalid Plotly data format. Must include data array or layout object.' 
      });
    }

    // Extract title from the Plotly data or use provided title
    const chartTitle = req.body.chartTitle || 
                      req.body.layout?.title?.text || 
                      'Untitled Chart';

    // Create new chart document
    const newChart = new Chart({
      plotlyData: req.body,
      chartTitle: chartTitle,
      description: req.body.description || '',
      tags: req.body.tags || []
    });

    const savedChart = await newChart.save();
    res.status(201).json({
      success: true,
      message: 'Chart saved successfully',
      chart: savedChart
    });
  } catch (error) {
    console.error('Error saving chart:', error);
    res.status(500).json({ 
      error: 'Failed to save chart',
      details: error.message 
    });
  }
});

// GET /api/charts - Get all charts (with pagination)
app.get('/api/charts', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get charts with pagination
    const charts = await Chart.find()
      .select('-plotlyData') // Exclude heavy plotly data for list view
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Chart.countDocuments();

    res.json({
      success: true,
      charts: charts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalCharts: total,
        hasMore: skip + charts.length < total
      }
    });
  } catch (error) {
    console.error('Error fetching charts:', error);
    res.status(500).json({ 
      error: 'Failed to fetch charts',
      details: error.message 
    });
  }
});

// GET /api/charts/:id - Get a specific chart by ID
app.get('/api/charts/:id', async (req, res) => {
  try {
    const chart = await Chart.findById(req.params.id);
    
    if (!chart) {
      return res.status(404).json({ 
        error: 'Chart not found' 
      });
    }

    res.json({
      success: true,
      chart: chart
    });
  } catch (error) {
    console.error('Error fetching chart:', error);
    res.status(500).json({ 
      error: 'Failed to fetch chart',
      details: error.message 
    });
  }
});

// PUT /api/charts/:id - Update a specific chart
app.put('/api/charts/:id', async (req, res) => {
  try {
    // Validate the incoming Plotly data if provided
    if (req.body.plotlyData && !isValidPlotlyData(req.body.plotlyData)) {
      return res.status(400).json({ 
        error: 'Invalid Plotly data format. Must include data array or layout object.' 
      });
    }

    const updateData = {};
    if (req.body.plotlyData) updateData.plotlyData = req.body.plotlyData;
    if (req.body.chartTitle) updateData.chartTitle = req.body.chartTitle;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.tags) updateData.tags = req.body.tags;
    
    const updatedChart = await Chart.findByIdAndUpdate(
      req.params.id, 
      updateData,
      { new: true } // Return the updated document
    );

    if (!updatedChart) {
      return res.status(404).json({ 
        error: 'Chart not found' 
      });
    }

    res.json({
      success: true,
      message: 'Chart updated successfully',
      chart: updatedChart
    });
  } catch (error) {
    console.error('Error updating chart:', error);
    res.status(500).json({ 
      error: 'Failed to update chart',
      details: error.message 
    });
  }
});

// DELETE /api/charts/:id - Delete a specific chart
app.delete('/api/charts/:id', async (req, res) => {
  try {
    const deletedChart = await Chart.findByIdAndDelete(req.params.id);
    
    if (!deletedChart) {
      return res.status(404).json({ 
        error: 'Chart not found' 
      });
    }

    res.json({
      success: true,
      message: 'Chart deleted successfully',
      chartId: req.params.id
    });
  } catch (error) {
    console.error('Error deleting chart:', error);
    res.status(500).json({ 
      error: 'Failed to delete chart',
      details: error.message 
    });
  }
});

// Legacy endpoint for backward compatibility
app.get('/api/plotly-data', (req, res) => {
  res.status(301).json({
    message: 'This endpoint has been deprecated. Please use GET /api/charts to fetch all charts or GET /api/charts/:id for a specific chart.',
    redirectTo: '/api/charts'
  });
});

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================

// Handle 404 errors
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The endpoint ${req.method} ${req.originalUrl} does not exist`,
    availableEndpoints: {
      'GET /': 'API information',
      'POST /api/charts': 'Upload a new chart',
      'GET /api/charts': 'Get all charts',
      'GET /api/charts/:id': 'Get chart by ID',
      'PUT /api/charts/:id': 'Update chart',
      'DELETE /api/charts/:id': 'Delete chart'
    }
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global Error Handler:', error);
  
  // Mongoose validation errors
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      error: 'Validation Error',
      details: errors
    });
  }
  
  // Mongoose cast errors (invalid ObjectId)
  if (error.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID format',
      details: 'The provided ID is not a valid MongoDB ObjectId'
    });
  }
  
  // JSON parsing errors
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Invalid JSON',
      details: 'Request body contains invalid JSON'
    });
  }
  
  // Default error response
  res.status(error.status || 500).json({
    error: error.message || 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

// =============================================================================
// START SERVER
// =============================================================================

// Start the server and listen on the specified port
app.listen(port, () => {
  console.log('🚀 Server started successfully!');
  console.log(`📡 Listening on: http://localhost:${port}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
  console.log('\n📋 Available endpoints:');
  console.log('   GET  / - API information');
  console.log('   POST /api/charts - Upload new chart');
  console.log('   GET  /api/charts - Get all charts');
  console.log('   GET  /api/charts/:id - Get specific chart');
  console.log('   PUT  /api/charts/:id - Update chart');
  console.log('   DELETE /api/charts/:id - Delete chart');
  console.log('\n📚 Ready to accept Plotly chart data!');
});
