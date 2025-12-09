"""
Smart Crop Advisor using LangChain and Groq
Provides AI-powered crop recommendations based on location, season, market prices, and weather
"""

import os
import json
from typing import Dict, Any, Optional
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field

# Load environment variables
load_dotenv()


class CropRecommendation(BaseModel):
    """Structured output for crop recommendation"""
    recommended_crop: str = Field(description="Name of the recommended crop to sow")
    expected_harvest_month: str = Field(description="Month when the crop will be ready to harvest")
    profitability_score: int = Field(description="Profitability score from 1-10", ge=1, le=10)
    explanation: str = Field(description="Detailed explanation of why this crop is profitable")
    alternative_crops: list[str] = Field(description="List of 2-3 alternative crops to consider")
    key_considerations: list[str] = Field(description="Important factors to consider (weather risks, input costs, etc.)")


def get_crop_recommendation(
    location: str,
    current_month: str,
    market_prices: Dict[str, float],
    weather_forecast: str
) -> Optional[Dict[str, Any]]:
    """
    Get AI-powered crop recommendation using LangChain and Groq
    
    Args:
        location: Location/region (e.g., "Punjab", "Haryana", "Uttar Pradesh")
        current_month: Current month (e.g., "October", "March")
        market_prices: Dictionary of crop prices (e.g., {"wheat": 2500, "rice": 3000, "cotton": 6000})
        weather_forecast: Weather prediction for next 3-4 months
        
    Returns:
        Dictionary containing crop recommendation or None if error occurs
        
    Example:
        >>> result = get_crop_recommendation(
        ...     location="Punjab",
        ...     current_month="October",
        ...     market_prices={"wheat": 2500, "rice": 3000, "mustard": 5500},
        ...     weather_forecast="Mild winter, good rainfall expected"
        ... )
        >>> print(result['recommended_crop'])
        'Wheat'
    """
    
    try:
        # Initialize Groq LLM (free, fast alternative to OpenAI)
        api_key = os.getenv('GROQ_API_KEY')
        if not api_key:
            raise ValueError("GROQ_API_KEY not found in environment variables")
        
        llm = ChatGroq(
            model="mixtral-8x7b-32768",  # Fast and accurate model
            temperature=0.3,  # Lower temperature for more consistent recommendations
            groq_api_key=api_key
        )
        
        # Setup output parser
        parser = PydanticOutputParser(pydantic_object=CropRecommendation)
        
        # Create expert agronomist prompt template
        prompt_template = """You are an expert Indian Agronomist with 20+ years of experience in crop planning and agricultural economics.

Your task is to analyze the given farming conditions and recommend the MOST PROFITABLE crop to sow next.

INPUTS:
- Location/Region: {location}
- Current Month: {current_month}
- Current Market Prices (₹/quintal): {market_prices}
- Weather Forecast: {weather_forecast}

ANALYSIS REQUIREMENTS:
1. Consider the crop growing seasons suitable for this region
2. Factor in current market prices and expected prices at harvest time
3. Account for weather conditions and climate suitability
4. Evaluate input costs, water requirements, and labor availability
5. Consider government MSP (Minimum Support Price) for major crops
6. Think about crop rotation and soil health

IMPORTANT CONTEXT FOR INDIAN AGRICULTURE:
- Rabi season (Oct-Mar): Wheat, Mustard, Chickpea, Barley
- Kharif season (Jun-Sep): Rice, Cotton, Maize, Soybean
- Zaid season (Mar-Jun): Watermelon, Cucumber, Muskmelon
- Punjab/Haryana are known for wheat-rice rotation
- Consider stubble burning regulations and sustainable practices

{format_instructions}

Provide a practical, data-driven recommendation that maximizes farmer profitability while considering sustainability."""

        prompt = PromptTemplate(
            template=prompt_template,
            input_variables=["location", "current_month", "market_prices", "weather_forecast"],
            partial_variables={"format_instructions": parser.get_format_instructions()}
        )
        
        # Format market prices as readable string
        prices_str = "\n".join([f"  • {crop.title()}: ₹{price}/quintal" for crop, price in market_prices.items()])
        
        # Create the chain
        chain = prompt | llm | parser
        
        # Get recommendation
        result = chain.invoke({
            "location": location,
            "current_month": current_month,
            "market_prices": prices_str,
            "weather_forecast": weather_forecast
        })
        
        # Convert to dictionary for easy JSON serialization
        return result.dict()
        
    except ValueError as ve:
        print(f"❌ Configuration Error: {str(ve)}")
        return {
            "error": "configuration_error",
            "message": str(ve),
            "fallback_recommendation": _get_fallback_recommendation(location, current_month)
        }
    
    except Exception as e:
        print(f"❌ Error getting crop recommendation: {str(e)}")
        return {
            "error": "api_error",
            "message": "Failed to get AI recommendation. Please try again.",
            "fallback_recommendation": _get_fallback_recommendation(location, current_month)
        }


def _get_fallback_recommendation(location: str, current_month: str) -> Dict[str, Any]:
    """
    Provide rule-based fallback recommendations when AI fails
    Based on traditional crop calendars for Indian states
    """
    
    # Simplified crop calendar for major regions
    crop_calendar = {
        "punjab": {
            "october": {"crop": "Wheat", "harvest": "April", "reason": "Traditional Rabi crop with good MSP"},
            "november": {"crop": "Wheat", "harvest": "April", "reason": "Ideal sowing time for wheat"},
            "june": {"crop": "Rice", "harvest": "October", "reason": "Monsoon season, suitable for paddy"},
            "march": {"crop": "Fodder Maize", "harvest": "June", "reason": "Zaid season, quick growing crop"}
        },
        "haryana": {
            "october": {"crop": "Wheat", "harvest": "April", "reason": "Main Rabi crop with assured MSP"},
            "june": {"crop": "Rice", "harvest": "September", "reason": "Kharif season with good water availability"}
        },
        "maharashtra": {
            "june": {"crop": "Cotton", "harvest": "November", "reason": "Kharif season, suitable for semi-arid climate"},
            "october": {"crop": "Chickpea", "harvest": "March", "reason": "Rabi pulse crop with good market demand"}
        },
        "default": {
            "october": {"crop": "Wheat", "harvest": "April", "reason": "Rabi season crop"},
            "june": {"crop": "Rice", "harvest": "October", "reason": "Kharif season crop"}
        }
    }
    
    # Normalize inputs
    location_key = location.lower().strip()
    month_key = current_month.lower().strip()
    
    # Get recommendation
    region_calendar = crop_calendar.get(location_key, crop_calendar["default"])
    recommendation = region_calendar.get(month_key, region_calendar.get("october"))
    
    return {
        "recommended_crop": recommendation["crop"],
        "expected_harvest_month": recommendation["harvest"],
        "profitability_score": 7,
        "explanation": f"{recommendation['reason']}. This is a traditional crop choice for {location} in {current_month}.",
        "alternative_crops": ["Mustard", "Chickpea", "Barley"],
        "key_considerations": [
            "Consult local agricultural department for latest advisories",
            "Check soil health and previous crop residue",
            "Ensure adequate water availability"
        ],
        "source": "fallback_rule_based"
    }


# Example usage and testing
if __name__ == "__main__":
    print("🌾 Smart Crop Advisor - Testing\n")
    
    # Test case 1: Punjab farmer in October
    print("=" * 60)
    print("Test Case 1: Punjab farmer planning for Rabi season")
    print("=" * 60)
    
    result = get_crop_recommendation(
        location="Punjab",
        current_month="October",
        market_prices={
            "wheat": 2500,
            "mustard": 5500,
            "chickpea": 5200,
            "barley": 2000
        },
        weather_forecast="Mild winter expected with normal rainfall. Temperature: 10-25°C"
    )
    
    if result:
        print(json.dumps(result, indent=2))
    
    print("\n" + "=" * 60)
    print("Test Case 2: Maharashtra farmer in June (Kharif season)")
    print("=" * 60)
    
    result2 = get_crop_recommendation(
        location="Maharashtra",
        current_month="June",
        market_prices={
            "cotton": 6000,
            "soybean": 4200,
            "maize": 2000
        },
        weather_forecast="Good monsoon expected. Rainfall: 700-900mm over next 4 months"
    )
    
    if result2:
        print(json.dumps(result2, indent=2))
