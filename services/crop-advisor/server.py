"""
FastAPI server for Smart Crop Advisor
REST API wrapper around the LangChain crop recommendation function
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Optional
import uvicorn
from crop_advisor import get_crop_recommendation

app = FastAPI(
    title="AgriTrack Smart Crop Advisor",
    description="AI-powered crop recommendations using LangChain and Groq",
    version="1.0.0"
)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CropAdvisorRequest(BaseModel):
    """Request model for crop recommendation"""
    location: str = Field(..., description="Location/region (e.g., Punjab, Haryana)", example="Punjab")
    current_month: str = Field(..., description="Current month", example="October")
    market_prices: Dict[str, float] = Field(
        ..., 
        description="Current market prices in ₹/quintal",
        example={"wheat": 2500, "mustard": 5500, "chickpea": 5200}
    )
    weather_forecast: str = Field(
        ..., 
        description="Weather forecast for next 3-4 months",
        example="Mild winter expected with normal rainfall"
    )


class CropAdvisorResponse(BaseModel):
    """Response model for crop recommendation"""
    success: bool
    data: Optional[Dict] = None
    error: Optional[str] = None


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "AgriTrack Smart Crop Advisor",
        "status": "running",
        "version": "1.0.0",
        "powered_by": "LangChain + Groq"
    }


@app.post("/api/recommend", response_model=CropAdvisorResponse)
async def recommend_crop(request: CropAdvisorRequest):
    """
    Get AI-powered crop recommendation
    
    Returns a detailed recommendation including:
    - Recommended crop to sow
    - Expected harvest month
    - Profitability score (1-10)
    - Detailed explanation
    - Alternative crops
    - Key considerations
    """
    try:
        result = get_crop_recommendation(
            location=request.location,
            current_month=request.current_month,
            market_prices=request.market_prices,
            weather_forecast=request.weather_forecast
        )
        
        if result is None:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate recommendation"
            )
        
        # Check if error occurred
        if "error" in result:
            return CropAdvisorResponse(
                success=False,
                error=result.get("message", "Unknown error occurred"),
                data=result.get("fallback_recommendation")
            )
        
        return CropAdvisorResponse(
            success=True,
            data=result
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing request: {str(e)}"
        )


@app.get("/api/example")
async def get_example():
    """Get an example recommendation (for testing)"""
    example_request = {
        "location": "Punjab",
        "current_month": "October",
        "market_prices": {
            "wheat": 2500,
            "mustard": 5500,
            "chickpea": 5200
        },
        "weather_forecast": "Mild winter expected with normal rainfall. Temperature: 10-25°C"
    }
    
    result = get_crop_recommendation(**example_request)
    
    return {
        "request": example_request,
        "recommendation": result
    }


if __name__ == "__main__":
    print("🌾 Starting Smart Crop Advisor API Server...")
    print("📍 API will be available at: http://localhost:8002")
    print("📖 API docs: http://localhost:8002/docs")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8002,
        log_level="info"
    )
