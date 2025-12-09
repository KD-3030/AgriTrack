# Smart Crop Advisor

AI-powered crop recommendation system using LangChain and Groq LLM.

## Features

- ✅ AI-powered recommendations based on location, season, market prices, and weather
- ✅ Structured JSON output for easy frontend integration
- ✅ Fallback rule-based recommendations if AI fails
- ✅ FastAPI REST API wrapper
- ✅ Free Groq API (faster and free alternative to OpenAI)
- ✅ Error handling and validation
- ✅ Indian agriculture context (Rabi/Kharif seasons, MSP, regional crops)

## Setup

### 1. Install Dependencies

```bash
cd services/crop-advisor
pip install -r requirements.txt
```

### 2. Get Groq API Key (Free)

1. Go to https://console.groq.com
2. Sign up for a free account
3. Create an API key
4. Copy the key

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env and add your GROQ_API_KEY
```

### 4. Test the Function

```bash
python crop_advisor.py
```

### 5. Run the API Server

```bash
python server.py
```

API will be available at:
- **API**: http://localhost:8002
- **Docs**: http://localhost:8002/docs

## Usage

### Python Function

```python
from crop_advisor import get_crop_recommendation

result = get_crop_recommendation(
    location="Punjab",
    current_month="October",
    market_prices={
        "wheat": 2500,
        "mustard": 5500,
        "chickpea": 5200
    },
    weather_forecast="Mild winter expected with normal rainfall"
)

print(result['recommended_crop'])  # "Wheat"
print(result['explanation'])  # Detailed explanation
```

### REST API

```bash
curl -X POST "http://localhost:8002/api/recommend" \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Punjab",
    "current_month": "October",
    "market_prices": {
      "wheat": 2500,
      "mustard": 5500,
      "chickpea": 5200
    },
    "weather_forecast": "Mild winter expected with normal rainfall"
  }'
```

### Frontend Integration (React/Next.js)

```typescript
const getCropRecommendation = async () => {
  const response = await fetch('http://localhost:8002/api/recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'Punjab',
      current_month: 'October',
      market_prices: {
        wheat: 2500,
        mustard: 5500,
        chickpea: 5200
      },
      weather_forecast: 'Mild winter expected with normal rainfall'
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    console.log(data.data.recommended_crop);
    console.log(data.data.explanation);
    console.log(data.data.alternative_crops);
  }
};
```

## Output Format

```json
{
  "recommended_crop": "Wheat",
  "expected_harvest_month": "April",
  "profitability_score": 9,
  "explanation": "Wheat is the most profitable choice for Punjab in October because...",
  "alternative_crops": ["Mustard", "Chickpea", "Barley"],
  "key_considerations": [
    "Ensure adequate irrigation facilities",
    "Monitor for pest attacks in early growth stage",
    "Consider crop insurance given weather uncertainties"
  ]
}
```

## Why Groq?

- **Free**: Generous free tier
- **Fast**: 10x faster than OpenAI in many cases
- **Quality**: Uses Mixtral-8x7B model (comparable to GPT-3.5)
- **Reliable**: Enterprise-grade infrastructure

## Alternative: Using OpenAI

To use OpenAI instead of Groq, modify `crop_advisor.py`:

```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model="gpt-4",  # or "gpt-3.5-turbo"
    temperature=0.3,
    openai_api_key=os.getenv('OPENAI_API_KEY')
)
```

## Error Handling

The function includes comprehensive error handling:

1. **API Key Missing**: Returns configuration error with fallback
2. **API Failure**: Returns API error with rule-based fallback
3. **Invalid Input**: Pydantic validation catches bad inputs
4. **Network Issues**: Gracefully degrades to traditional recommendations

## Fallback System

If AI fails, the system provides rule-based recommendations based on:
- Traditional crop calendars for Indian states
- Rabi/Kharif/Zaid seasons
- Regional climate suitability
- Historical crop patterns

## License

MIT
