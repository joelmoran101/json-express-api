# Plotly Chart Storage API

A Node.js Express API for storing and retrieving complete Plotly JSON chart figures with MongoDB.

## Features

- 📊 Store complete Plotly JSON figures without deconstruction
- 🔍 Retrieve charts by ID or list all charts with pagination
- ✅ Input validation for Plotly data
- 🔄 Full CRUD operations (Create, Read, Update, Delete)
- 🌐 CORS enabled for React frontend integration
- 📝 Comprehensive error handling
- 🏷️ Chart metadata support (title, description, tags)

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (running locally or remote connection)

### Installation

1. Clone or download this project
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   
4. Edit `.env` file with your MongoDB connection string:
   ```env
   MONGODB_URI=mongodb://localhost:27017/your-database-name
   PORT=3001
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:3000
   ```

5. Start the server:
   ```bash
   npm start
   ```
   
   For development with auto-reload:
   ```bash
   npm run dev
   ```

## API Endpoints

### Base URL: `http://localhost:3001`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API information and available endpoints |
| POST | `/api/charts` | Upload a new Plotly chart |
| GET | `/api/charts` | Get all charts (paginated) |
| GET | `/api/charts/:id` | Get specific chart by ID |
| PUT | `/api/charts/:id` | Update specific chart |
| DELETE | `/api/charts/:id` | Delete specific chart |

### Usage Examples

#### 1. Upload a Plotly Chart

```bash
curl -X POST http://localhost:3001/api/charts \
  -H "Content-Type: application/json" \
  -d '{
    "data": [{"x": [1,2,3], "y": [1,4,9], "type": "scatter"}],
    "layout": {"title": {"text": "My Chart"}},
    "description": "Sample scatter plot",
    "tags": ["scatter", "sample"]
  }'
```

#### 2. Get All Charts

```bash
curl http://localhost:3001/api/charts?page=1&limit=5
```

#### 3. Get Specific Chart

```bash
curl http://localhost:3001/api/charts/CHART_ID_HERE
```

#### 4. Update Chart

```bash
curl -X PUT http://localhost:3001/api/charts/CHART_ID_HERE \
  -H "Content-Type: application/json" \
  -d '{
    "chartTitle": "Updated Chart Title",
    "description": "Updated description"
  }'
```

#### 5. Delete Chart

```bash
curl -X DELETE http://localhost:3001/api/charts/CHART_ID_HERE
```

## React Integration

### Uploading Charts from React

```javascript
const uploadChart = async (plotlyFigure) => {
  try {
    const response = await fetch('http://localhost:3001/api/charts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(plotlyFigure)
    });
    
    const result = await response.json();
    console.log('Chart uploaded:', result.chart._id);
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

### Fetching and Rendering Charts in React

```javascript
import Plot from 'react-plotly.js';

const ChartComponent = ({ chartId }) => {
  const [chartData, setChartData] = useState(null);
  
  useEffect(() => {
    const fetchChart = async () => {
      try {
        const response = await fetch(`http://localhost:3001/api/charts/${chartId}`);
        const result = await response.json();
        setChartData(result.chart.plotlyData);
      } catch (error) {
        console.error('Failed to fetch chart:', error);
      }
    };
    
    fetchChart();
  }, [chartId]);
  
  if (!chartData) return <div>Loading...</div>;
  
  return (
    <Plot
      data={chartData.data}
      layout={chartData.layout}
      style={{width: "100%", height: "400px"}}
    />
  );
};
```

## Data Structure

### Chart Document Schema

```json
{
  "_id": "ObjectId",
  "plotlyData": {
    "data": [...],      // Plotly trace data
    "layout": {...}     // Plotly layout configuration
  },
  "chartTitle": "Chart Title",
  "description": "Optional description",
  "tags": ["tag1", "tag2"],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Plotly Data Format

The API accepts and stores complete Plotly figure JSON objects. Your data should include:

```json
{
  "data": [
    {
      "x": [1, 2, 3, 4],
      "y": [10, 11, 12, 13],
      "type": "scatter"
    }
  ],
  "layout": {
    "title": "My Chart",
    "xaxis": {"title": "X Axis"},
    "yaxis": {"title": "Y Axis"}
  }
}
```

## Development

### Project Structure

```
json-express-api/
├── app.js              # Main application file
├── chartModel.js       # MongoDB schema
├── config/
│   └── database.js     # Database connection
├── package.json
├── .env               # Environment variables (not committed)
├── .env.example       # Environment template
├── .gitignore
└── README.md
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/plotly-charts` |
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment mode | `development` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |

## Error Handling

The API includes comprehensive error handling for:

- Invalid JSON data
- Malformed Plotly data structures
- MongoDB validation errors
- Invalid ObjectId formats
- 404 Not Found errors
- 500 Internal Server errors

## Security Considerations

- Input validation for all incoming data
- CORS configuration for frontend domains
- MongoDB injection protection via Mongoose
- Error messages don't expose internal system details in production

## License

MIT License - feel free to use this in your projects!