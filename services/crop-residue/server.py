"""
FastAPI Server for Crop Residue Management System
=================================================
Exposes REST API endpoints for harvest predictions and machine allocations.
All data is generated dynamically - no hardcoded responses.

Endpoints:
    GET  /api/health          - Health check
    GET  /api/districts       - List all districts with current NDVI
    GET  /api/predictions     - Get harvest predictions for all districts
    GET  /api/allocations     - Get machine allocations
    GET  /api/machines        - List all available machines
    GET  /api/urgent          - Get urgent districts only (priority >= 7)
    POST /api/predict         - Run prediction with custom parameters
"""

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
from datetime import datetime
import json

# Import our prediction modules
from mock_data import generate_district_ndvi_data, get_machines_data, get_districts_data, DISTRICTS
from harvest_predictor import HarvestPredictor
from machine_allocator import MachineAllocator

# Initialize FastAPI app
app = FastAPI(
    title="Crop Residue Management API",
    description="Satellite-based harvest prediction and machine allocation for Punjab, Haryana, Delhi-NCR",
    version="1.0.0"
)

# Enable CORS for Next.js frontend (localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "*"  # Allow all for development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ═══════════════════════════════════════════════════════════════════════════
# DYNAMIC DATA GENERATION
# ═══════════════════════════════════════════════════════════════════════════

def get_fresh_predictions(num_days: int = 30) -> tuple:
    """
    Generate fresh NDVI data and predictions dynamically.
    Called on each request to ensure data is current.
    
    Returns:
        Tuple of (predictor, predictions_list)
    """
    # Generate new NDVI time-series data
    ndvi_data = generate_district_ndvi_data(num_days=num_days)
    
    # Create predictor and run analysis
    predictor = HarvestPredictor(ndvi_data)
    predictions = predictor.predict_all_districts()
    
    return predictor, predictions


def get_fresh_allocations(predictions: List[dict]) -> tuple:
    """
    Generate fresh machine allocations based on current predictions.
    
    Args:
        predictions: List of prediction dictionaries
        
    Returns:
        Tuple of (allocator, allocations_list, summary)
    """
    # Get fresh machine data (all available)
    machines = get_machines_data()
    
    # Run allocation algorithm
    allocator = MachineAllocator(machines, predictions)
    allocations = allocator.allocate_machines()
    summary = allocator.get_allocation_summary()
    
    return allocator, allocations, summary


# ═══════════════════════════════════════════════════════════════════════════
# API ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "Crop Residue Management API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/api/health",
            "districts": "/api/districts",
            "predictions": "/api/predictions",
            "allocations": "/api/allocations",
            "machines": "/api/machines",
            "urgent": "/api/urgent",
            "dashboard": "/api/dashboard"
        }
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "crop-residue-api"
    }


@app.get("/api/districts")
async def get_districts():
    """
    Get all districts with their basic information and latest NDVI.
    Data is generated dynamically.
    """
    # Generate fresh NDVI data
    ndvi_data = generate_district_ndvi_data(num_days=30)
    
    # Get latest NDVI for each district
    districts_with_ndvi = []
    for district in get_districts_data():
        district_ndvi = ndvi_data[ndvi_data['district_id'] == district['id']]
        latest_ndvi = district_ndvi.iloc[-1]['ndvi'] if len(district_ndvi) > 0 else None
        
        districts_with_ndvi.append({
            **district,
            "current_ndvi": round(latest_ndvi, 4) if latest_ndvi else None,
            "last_updated": datetime.now().isoformat()
        })
    
    return {
        "count": len(districts_with_ndvi),
        "generated_at": datetime.now().isoformat(),
        "districts": districts_with_ndvi
    }


@app.get("/api/predictions")
async def get_predictions(
    num_days: int = Query(default=30, ge=7, le=90, description="Days of NDVI history to analyze"),
    min_priority: Optional[int] = Query(default=None, ge=1, le=10, description="Filter by minimum priority")
):
    """
    Get harvest predictions for all districts.
    Predictions are generated dynamically based on simulated NDVI data.
    
    Query Parameters:
        - num_days: Number of days of NDVI history to analyze (7-90)
        - min_priority: Filter to show only districts with this priority or higher
    """
    # Generate fresh predictions
    predictor, predictions = get_fresh_predictions(num_days)
    
    # Apply priority filter if specified
    if min_priority:
        predictions = [p for p in predictions if p['priority_score'] >= min_priority]
    
    return {
        "count": len(predictions),
        "analysis_days": num_days,
        "generated_at": datetime.now().isoformat(),
        "harvest_threshold": HarvestPredictor.HARVEST_THRESHOLD,
        "predictions": predictions
    }


@app.get("/api/allocations")
async def get_allocations(
    num_days: int = Query(default=30, ge=7, le=90, description="Days of NDVI history")
):
    """
    Get machine allocations for all districts.
    Allocations are computed dynamically using greedy algorithm.
    """
    # Generate fresh predictions first
    _, predictions = get_fresh_predictions(num_days)
    
    # Generate fresh allocations
    allocator, allocations, summary = get_fresh_allocations(predictions)
    
    return {
        "generated_at": datetime.now().isoformat(),
        "algorithm": "greedy_nearest_machine",
        "allocations": allocations,
        "unallocated": allocator.unallocated_districts,
        "summary": summary
    }


@app.get("/api/machines")
async def get_machines():
    """
    Get all available machines with their details.
    Returns fresh machine data on each request.
    """
    machines = get_machines_data()
    
    # Group by type
    by_type = {}
    for m in machines:
        mt = m['type']
        if mt not in by_type:
            by_type[mt] = []
        by_type[mt].append(m)
    
    return {
        "count": len(machines),
        "generated_at": datetime.now().isoformat(),
        "machines": machines,
        "by_type": by_type
    }


@app.get("/api/urgent")
async def get_urgent_districts(
    threshold: int = Query(default=7, ge=1, le=10, description="Minimum priority score for urgent status")
):
    """
    Get only urgent districts that need immediate attention.
    Dynamically filters based on priority threshold.
    """
    # Generate fresh predictions
    _, predictions = get_fresh_predictions(30)
    
    # Filter urgent
    urgent = [p for p in predictions if p['priority_score'] >= threshold]
    
    return {
        "count": len(urgent),
        "threshold": threshold,
        "generated_at": datetime.now().isoformat(),
        "urgent_districts": urgent
    }


@app.get("/api/dashboard")
async def get_dashboard_data():
    """
    Get all data needed for the dashboard in a single request.
    Combines predictions, allocations, and summary statistics.
    This is the main endpoint for the Next.js frontend.
    """
    # Generate fresh predictions
    predictor, predictions = get_fresh_predictions(30)
    
    # Generate fresh allocations
    allocator, allocations, summary = get_fresh_allocations(predictions)
    
    # Get machines data
    machines = get_machines_data()
    
    # Calculate additional statistics
    urgent_count = len([p for p in predictions if p['priority_score'] >= 7])
    avg_ndvi = sum(p['current_ndvi'] for p in predictions) / len(predictions) if predictions else 0
    harvest_ready = len([p for p in predictions if p['status'] == 'HARVEST_READY'])
    
    return {
        "metadata": {
            "generated_at": datetime.now().isoformat(),
            "region": "Punjab, Haryana, Chandigarh, Delhi-NCR",
            "analysis_days": 30
        },
        "statistics": {
            "total_districts": len(predictions),
            "urgent_districts": urgent_count,
            "harvest_ready": harvest_ready,
            "average_ndvi": round(avg_ndvi, 4),
            "total_machines": len(machines),
            "machines_allocated": summary['districts_allocated'],
            "allocation_rate": summary['allocation_rate'],
            "total_travel_km": summary['total_travel_distance_km']
        },
        "predictions": predictions,
        "allocations": allocations,
        "unallocated": allocator.unallocated_districts,
        "machines": machines,
        "summary": summary
    }


@app.get("/api/ndvi-history/{district_id}")
async def get_ndvi_history(
    district_id: str,
    num_days: int = Query(default=30, ge=7, le=90)
):
    """
    Get NDVI time-series history for a specific district.
    Useful for displaying trend charts.
    """
    # Generate NDVI data
    ndvi_data = generate_district_ndvi_data(num_days=num_days)
    
    # Filter for specific district
    district_data = ndvi_data[ndvi_data['district_id'] == district_id]
    
    if len(district_data) == 0:
        raise HTTPException(status_code=404, detail=f"District {district_id} not found")
    
    # Convert to list of records
    history = district_data[['date', 'ndvi']].to_dict(orient='records')
    
    # Get district info
    district_info = district_data.iloc[0]
    
    return {
        "district_id": district_id,
        "district_name": district_info['district_name'],
        "state": district_info['state'],
        "num_days": num_days,
        "generated_at": datetime.now().isoformat(),
        "history": history
    }


# ═══════════════════════════════════════════════════════════════════════════
# RUN SERVER
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    print("\n🌾 Starting Crop Residue Management API Server...")
    print("📡 Endpoints available at http://localhost:8000")
    print("📖 API Documentation at http://localhost:8000/docs")
    print()
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
