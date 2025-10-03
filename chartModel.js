// chartModel.js
const mongoose = require('mongoose');

const ChartSchema = new mongoose.Schema({
  plotlyData: {
    type: mongoose.Schema.Types.Mixed, // Store the entire Plotly JSON figure
    required: true
  },
  chartTitle: {
    type: String,
    required: false,
    default: function() {
      // Extract title from plotlyData if available
      return this.plotlyData?.layout?.title?.text || 'Untitled Chart';
    }
  },
  description: {
    type: String,
    required: false
  },
  tags: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // Automatically handle createdAt and updatedAt
});

module.exports = mongoose.model('Chart', ChartSchema);
