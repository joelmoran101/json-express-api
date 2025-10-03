#!/usr/bin/env python3
"""
Export Plotly figure to JSON file for API upload

🎯 PURPOSE:
This utility script converts Plotly figure objects into JSON files
that can be uploaded to the Plotly Chart Storage API.

📁 TEMPORARY FILES CREATED:
This script generates JSON files (like monthly-sales.json, tech-revenues.json)
that are TEMPORARY and can be safely deleted after successful upload to MongoDB.

🔄 WORKFLOW:
1. Create Plotly figure → 2. Run this script → 3. Upload JSON to API → 4. Delete JSON file

🗑️ CLEANUP:
After uploading charts to the API, you can delete the generated JSON files:
    rm monthly-sales.json tech-revenues.json

The chart data will remain safely stored in MongoDB and accessible via:
    curl http://localhost:3001/api/charts

⚠️ NOTE: This script itself can also be deleted if no longer needed.
"""
import json
import plotly.graph_objects as go
import plotly.express as px

def export_plotly_to_json(fig, filename, title="", description="", tags=None):
    """
    Export a Plotly figure to JSON file format for API upload
    
    Args:
        fig: Plotly figure object
        filename: Output JSON filename
        title: Chart title for metadata
        description: Chart description
        tags: List of tags
    """
    if tags is None:
        tags = []
    
    # Get the figure as dictionary
    fig_dict = fig.to_dict()
    
    # Create the API-compatible format
    chart_data = {
        "data": fig_dict["data"],
        "layout": fig_dict["layout"],
        "chartTitle": title,
        "description": description,
        "tags": tags
    }
    
    # Write to JSON file
    with open(filename, 'w') as f:
        json.dump(chart_data, f, indent=2)
    
    print(f"✅ Chart exported to {filename}")
    print(f"📊 Title: {title}")
    print(f"📝 Description: {description}")
    print(f"🏷️  Tags: {tags}")

# Example usage:
if __name__ == "__main__":
    # Example 1: Simple line chart
    fig1 = go.Figure()
    fig1.add_trace(go.Scatter(
        x=['Jan', 'Feb', 'Mar', 'Apr', 'May'],
        y=[20, 14, 23, 25, 22],
        mode='lines+markers',
        name='Sales'
    ))
    fig1.update_layout(
        title='Monthly Sales',
        xaxis_title='Month',
        yaxis_title='Sales ($K)'
    )
    
    export_plotly_to_json(
        fig1, 
        "monthly-sales.json",
        title="Monthly Sales Report",
        description="Sales performance over 5 months",
        tags=["sales", "monthly", "line-chart"]
    )
    
    # Example 2: Bar chart with Plotly Express
    df_data = {
        'Company': ['Apple', 'Google', 'Microsoft', 'Amazon'],
        'Revenue': [365, 283, 198, 469]
    }
    
    fig2 = px.bar(df_data, x='Company', y='Revenue', 
                  title='Tech Company Revenues')
    
    export_plotly_to_json(
        fig2,
        "tech-revenues.json",
        title="Tech Company Revenue Comparison",
        description="Revenue comparison of major tech companies",
        tags=["revenue", "tech", "comparison", "bar-chart"]
    )
    
    print("\n🚀 Ready to upload! Use:")
    print("curl -X POST http://localhost:3001/api/charts -H 'Content-Type: application/json' -d @monthly-sales.json")
    print("curl -X POST http://localhost:3001/api/charts -H 'Content-Type: application/json' -d @tech-revenues.json")