# Temporary Files Documentation

This document explains the temporary JSON files in this directory, their purpose, and how to manage them.

## 📁 Temporary JSON Files Overview

These files were created for testing and demonstrating the Plotly Chart Storage API. They serve as **input data** for the `POST /api/charts` endpoint and can be safely deleted after successful upload to MongoDB.

---

### 📊 `sample-chart.json`
- **Purpose**: Contains comprehensive financial data for major companies (AAPL, AMGN, AMZN, BBWI, BMY)
- **Content**: Complex multi-company quarterly CCP (Cash and Cash Plus) analysis from 2018-2023
- **Size**: ~20KB (large dataset with multiple data series)
- **Created**: For testing the API with real-world complex Plotly data
- **Status**: ✅ Successfully uploaded to MongoDB (Chart ID: `68deb8396db01ec0a708a67b`)
- **Upload Command Used**: 
  ```bash
  curl -X POST http://localhost:3001/api/charts \
    -H "Content-Type: application/json" \
    -d @sample-chart.json
  ```

### 📈 `simple-chart.json` 
- **Purpose**: Basic quarterly revenue bar chart for testing
- **Content**: Simple 4-data-point bar chart (Q1-Q4 revenue data)
- **Size**: ~400 bytes (minimal test data)
- **Created**: For testing API with small, simple datasets
- **Status**: ✅ Successfully uploaded to MongoDB (Chart ID: `68dec4056db01ec0a708a683`)
- **Upload Command Used**:
  ```bash
  curl -X POST http://localhost:3001/api/charts \
    -H "Content-Type: application/json" \
    -d @simple-chart.json
  ```

### 🧪 `my-test-chart.json`
- **Purpose**: Additional test chart (content varies based on testing)
- **Content**: Test data for API validation
- **Size**: Variable
- **Created**: For general API testing and validation
- **Status**: May or may not be uploaded (check API logs)

---

## 🔄 Workflow: JSON Files → MongoDB

```
1. Create JSON file (with Plotly data + metadata)
     ↓
2. POST to API: curl -d @filename.json http://localhost:3001/api/charts
     ↓
3. Data stored in MongoDB (get Chart ID in response)
     ↓
4. JSON file becomes redundant (data now in database)
     ↓
5. Optional: Delete JSON file (data persists in MongoDB)
```

---

## 🗑️ Safe Cleanup Instructions

### To delete specific files:
```bash
# Delete individual files
rm sample-chart.json
rm simple-chart.json  
rm my-test-chart.json
```

### To delete all temporary JSON files (keep project files):
```bash
# Safe cleanup - only removes chart data files, keeps project files
rm -f *chart*.json
# This keeps package.json, package-lock.json (which are essential)
```

### To verify data is safe before deletion:
```bash
# Check what's stored in MongoDB
curl http://localhost:3001/api/charts

# Get specific chart data
curl http://localhost:3001/api/charts/[CHART_ID_HERE]
```

---

## ⚠️ IMPORTANT NOTES

### ✅ SAFE TO DELETE:
- `sample-chart.json` (data is in MongoDB)
- `simple-chart.json` (data is in MongoDB) 
- `my-test-chart.json` (if uploaded to MongoDB)
- `export_plotly.py` (just a utility script)
- Any `*chart*.json` files you created for testing

### ❌ NEVER DELETE:
- `package.json` (project dependencies)
- `package-lock.json` (dependency lock file)
- `app.js` (main server file)
- `chartModel.js` (database schema)
- `config/database.js` (database connection)
- `.env` (environment variables)
- `.gitignore` (git configuration)
- `README.md` (main project documentation)

---

## 🧹 Cleanup Commands

### Check current temporary files:
```bash
ls -la *.json | grep -v package
```

### Verify MongoDB has your data:
```bash
curl http://localhost:3001/api/charts | grep -o '"chartTitle":"[^"]*"'
```

### Clean up when ready:
```bash
# Conservative approach - delete one by one
rm sample-chart.json
rm simple-chart.json
rm my-test-chart.json

# Or bulk delete all chart files
rm -f *chart*.json

echo "✅ Temporary files cleaned up!"
echo "Your chart data remains safe in MongoDB"
```

---

## 📋 File Type Reference

| File Pattern | Purpose | Safe to Delete? |
|-------------|---------|----------------|
| `*chart*.json` | Plotly chart data | ✅ Yes (after upload) |
| `package*.json` | Project dependencies | ❌ Never |
| `*.js` | Application code | ❌ Never |
| `.env*` | Configuration | ❌ Never |
| `README*.md` | Documentation | 📝 Optional |

---

*Last updated: October 2, 2025*  
*Note: This file itself can be deleted if no longer needed for reference.*