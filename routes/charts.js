const express = require('express');
const Chart = require('../chartModel');
const { 
  validateCreateChart, 
  validateUpdateChart, 
  validateChartId, 
  validatePagination,
  validateRequestSize,
  validateContentType
} = require('../middleware/validation');
const { strictLimiter } = require('../middleware/security');
const { asyncHandler, createError } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * @route   GET /api/charts
 * @desc    Get all charts with pagination and filtering
 * @access  Public
 */
router.get('/', 
  validatePagination,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || '-createdAt';
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    if (req.query.search) {
      filter.$or = [
        { chartTitle: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { tags: { $in: [new RegExp(req.query.search, 'i')] } }
      ];
    }

    // Get charts with pagination
    const charts = await Chart.find(filter)
      .select('-plotlyData') // Exclude heavy plotly data for list view
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(); // Use lean() for better performance

    const total = await Chart.countDocuments(filter);

    res.json({
      success: true,
      data: {
        charts,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalCharts: total,
          chartsPerPage: limit,
          hasNextPage: skip + charts.length < total,
          hasPrevPage: page > 1
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  })
);

/**
 * @route   GET /api/charts/:id
 * @desc    Get a specific chart by ID
 * @access  Public
 */
router.get('/:id',
  validateChartId,
  asyncHandler(async (req, res) => {
    const chart = await Chart.findById(req.params.id).lean();
    
    if (!chart) {
      throw createError(404, 'Chart not found');
    }

    res.json({
      success: true,
      data: {
        chart
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  })
);

/**
 * @route   POST /api/charts
 * @desc    Create a new chart
 * @access  Public
 */
router.post('/',
  strictLimiter,
  validateRequestSize('2mb'),
  validateContentType(['application/json']),
  validateCreateChart,
  asyncHandler(async (req, res) => {
    // Extract title from the Plotly data or use provided title
    const chartTitle = req.body.chartTitle || 
                      req.body.plotlyData?.layout?.title?.text || 
                      'Untitled Chart';

    // Create new chart document
    const newChart = new Chart({
      plotlyData: req.body.plotlyData,
      chartTitle: chartTitle,
      description: req.body.description || '',
      tags: req.body.tags || []
    });

    const savedChart = await newChart.save();
    
    res.status(201).json({
      success: true,
      message: 'Chart created successfully',
      data: {
        chart: savedChart
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  })
);

/**
 * @route   PUT /api/charts/:id
 * @desc    Update a specific chart
 * @access  Public
 */
router.put('/:id',
  strictLimiter,
  validateRequestSize('2mb'),
  validateContentType(['application/json']),
  validateUpdateChart,
  asyncHandler(async (req, res) => {
    const updateData = {};
    
    // Only update fields that are provided
    if (req.body.plotlyData) updateData.plotlyData = req.body.plotlyData;
    if (req.body.chartTitle) updateData.chartTitle = req.body.chartTitle;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.tags) updateData.tags = req.body.tags;
    
    // Always update the updatedAt timestamp
    updateData.updatedAt = new Date();
    
    const updatedChart = await Chart.findByIdAndUpdate(
      req.params.id, 
      updateData,
      { 
        new: true, // Return the updated document
        runValidators: true // Run mongoose validators
      }
    );

    if (!updatedChart) {
      throw createError(404, 'Chart not found');
    }

    res.json({
      success: true,
      message: 'Chart updated successfully',
      data: {
        chart: updatedChart
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  })
);

/**
 * @route   DELETE /api/charts/:id
 * @desc    Delete a specific chart
 * @access  Public
 */
router.delete('/:id',
  strictLimiter,
  validateChartId,
  asyncHandler(async (req, res) => {
    const deletedChart = await Chart.findByIdAndDelete(req.params.id);
    
    if (!deletedChart) {
      throw createError(404, 'Chart not found');
    }

    res.json({
      success: true,
      message: 'Chart deleted successfully',
      data: {
        chartId: req.params.id,
        deletedChart: {
          id: deletedChart._id,
          chartTitle: deletedChart.chartTitle,
          createdAt: deletedChart.createdAt
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  })
);

/**
 * @route   GET /api/charts/:id/stats
 * @desc    Get chart statistics (size, complexity, etc.)
 * @access  Public
 */
router.get('/:id/stats',
  validateChartId,
  asyncHandler(async (req, res) => {
    const chart = await Chart.findById(req.params.id).lean();
    
    if (!chart) {
      throw createError(404, 'Chart not found');
    }

    // Calculate statistics
    const stats = {
      id: chart._id,
      chartTitle: chart.chartTitle,
      createdAt: chart.createdAt,
      updatedAt: chart.updatedAt,
      dataPoints: chart.plotlyData?.data ? 
        chart.plotlyData.data.reduce((total, trace) => {
          return total + (trace.x?.length || trace.y?.length || 0);
        }, 0) : 0,
      numberOfTraces: chart.plotlyData?.data?.length || 0,
      hasLayout: !!chart.plotlyData?.layout,
      tags: chart.tags || [],
      tagCount: chart.tags?.length || 0,
      descriptionLength: chart.description?.length || 0,
      estimatedSize: JSON.stringify(chart.plotlyData).length
    };

    res.json({
      success: true,
      data: {
        stats
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  })
);

/**
 * @route   POST /api/charts/:id/duplicate
 * @desc    Duplicate a chart
 * @access  Public
 */
router.post('/:id/duplicate',
  strictLimiter,
  validateChartId,
  asyncHandler(async (req, res) => {
    const originalChart = await Chart.findById(req.params.id).lean();
    
    if (!originalChart) {
      throw createError(404, 'Chart not found');
    }

    // Create duplicate with modified title
    const duplicateChart = new Chart({
      plotlyData: originalChart.plotlyData,
      chartTitle: `${originalChart.chartTitle} (Copy)`,
      description: originalChart.description,
      tags: originalChart.tags
    });

    const savedDuplicate = await duplicateChart.save();
    
    res.status(201).json({
      success: true,
      message: 'Chart duplicated successfully',
      data: {
        original: {
          id: originalChart._id,
          chartTitle: originalChart.chartTitle
        },
        duplicate: savedDuplicate
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  })
);

// Legacy endpoint for backward compatibility
router.get('/legacy/plotly-data', (req, res) => {
  res.status(301).json({
    success: false,
    message: 'This endpoint has been deprecated. Please use GET /api/charts to fetch all charts or GET /api/charts/:id for a specific chart.',
    redirectTo: '/api/charts',
    meta: {
      timestamp: new Date().toISOString(),
      deprecated: true,
      version: '1.0.0'
    }
  });
});

module.exports = router;