require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS so the Expo app can connect from any origin
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use(express.json());

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Define AI Pipeline Route
app.get('/api/dashboard-data', async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      tools: [{ googleSearch: {} }] // ENABLE LIVE GOOGLE SEARCH GROUNDING
    });

    const prompt = `
      You are an expert AI quantitative analyst and portfolio manager for the Indian Stock Market. The current date is February 22, 2026.
      Generate a dynamic JSON payload for a pre-market dashboard. 
      The JSON MUST strictly follow this exact structure, containing highly specific, realistic technicals and macro events for today.
      CRITICAL: You MUST use the Google Search tool to find the LATEST real-time price of any stock you pick (e.g. RELIANCE on NSE) before calculating Entry, StopLoss, and Target. Do NOT output old hallucinated prices like 2980 for RELIANCE if the current price is ~1419. Use currently valid, active NSE stock tickers.
      
      Structure:
      {
        "PICKS": [
          // Array of exactly 4 active swing trade stocks. Make sure exactly 2 stocks only pass "Daily" timeframe testing, and exactly 2 completely different stocks only pass "Weekly" timeframe testing.
          // Must include exactly: ticker, type ('Swing'|'Intraday'), strategy, entry, stopLoss, target, holdingTime, reason, sectorTrend ('Bullish'|'Bearish'), speculationTheme (string or null), passingTimeframes (MUST BE EITHER ["Daily"] OR ["Weekly"]), timeframes: { daily: { rsi, adx, volume, delivery }, weekly: { rsi, adx, volume, delivery } }, backtestData: { totalTradesExecuted: number, successPercentage: string }
        ],
        "SECTORS": [
          // Array of exactly 4 sectors.
          // Fields: name, trend, reason
        ],
        "GLOBAL_MARKETS": [
          // Array of US, China, Russia, Gold, Silver, ADRs.
          // Fields: region, value, change, signal
        ],
        "SPECULATIONS": [
          // Array of top 4 global macro themes.
          // Fields: theme, news, stocks, reason, sectorTrend, stockTrend
        ],
        "LIVE_NEWS": [
          // Array of top 4 latest live news items today impacting the Indian markets.
          // Fields: headline (string), summary (string), impactedStocks (array of strings, e.g. ["RELIANCE", "TCS"]), sentiment ('Bullish'|'Bearish'|'Neutral')
        ]
      }
      
      CRITICAL INSTRUCTIONS FOR VALID JSON:
      1. All numerical strings with signs (like "+0.82%" or "-0.15%") MUST be enclosed in double quotes. Do not output unquoted numbers with plus signs.
      2. Respond ONLY with the raw JSON object. Do not include javascript or markdown formatting like \`\`\`json.
    `;

    // Commenting out the actual API call until you provide your key in the .env file
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_api_key_here') {
      console.warn("No valid GEMINI_API_KEY found. Returning mock data.");
      return res.json(getMockData());
    }

    const result = await model.generateContent(prompt);
    const textResponse = result.response.text().trim();

    // Safely extract JSON if it was wrapped in markdown blocks
    let jsonStr = textResponse;
    const jsonMatch = textResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    // Clean any trailing text after the last brace
    const lastBraceIndex = jsonStr.lastIndexOf('}');
    const firstBraceIndex = jsonStr.indexOf('{');
    if (lastBraceIndex !== -1 && firstBraceIndex !== -1) {
      jsonStr = jsonStr.substring(firstBraceIndex, lastBraceIndex + 1);
    }

    const data = JSON.parse(jsonStr);

    res.json(data);
  } catch (error) {
    console.error('Error in AI pipeline:', error);
    res.status(500).json({ error: 'Failed to generate dashboard data. Check terminal logs.' });
  }
});

// Start Server
app.listen(port, () => {
  console.log(`Backend Server running on http://localhost:${port}`);
  console.log(`Endpoint ready at http://localhost:${port}/api/dashboard-data`);
});

// Fallback Mock Data if API key is not set
function getMockData() {
  return {
    "PICKS": [
      {
        "ticker": "BHEL",
        "type": "Swing",
        "strategy": "Technical | Momentum",
        "entry": "₹315.00",
        "stopLoss": "₹298.00",
        "target": "₹345.00",
        "holdingTime": "1 - 3 Weeks",
        "reason": "Power Sector Bullish. 20>50 EMA and Price>200 EMA confirmed. Super high volume and steady delivery % accumulation over 3 days.",
        "sectorTrend": "Bullish",
        "speculationTheme": null,
        "passingTimeframes": ["Daily", "Weekly"],
        "timeframes": {
          "daily": { "rsi": 65, "adx": 28, "volume": "2.5x To 20D", "delivery": "Up 4 Days" },
          "weekly": { "rsi": 68, "adx": 31, "volume": "1.8x To 20W", "delivery": "Strong" }
        },
        "backtestData": { "totalTradesExecuted": 84, "successPercentage": "68%" }
      },
      {
        "ticker": "HAL",
        "type": "Swing",
        "strategy": "Technical | Breakout",
        "entry": "₹3,920.00",
        "stopLoss": "₹3,750.00",
        "target": "₹4,300.00",
        "holdingTime": "2 - 4 Weeks",
        "reason": "Defence Sector Bullish. Extremely strong trend mechanics meeting all EMA, RSI (>60) and ADX (>25) screener rules with heavy institutional delivery.",
        "sectorTrend": "Bullish",
        "speculationTheme": "Record Indian Defence Exports",
        "passingTimeframes": ["Daily", "Weekly"],
        "timeframes": {
          "daily": { "rsi": 71, "adx": 35, "volume": "3.1x To 20D", "delivery": "Up 3 Days" },
          "weekly": { "rsi": 74, "adx": 42, "volume": "2.1x To 20W", "delivery": "Heavy Accum." }
        },
        "backtestData": { "totalTradesExecuted": 112, "successPercentage": "74%" }
      }
    ],
    "SECTORS": [
      { "name": "Energy / Power", "trend": "Bullish", "reason": "US-Iran tensions supporting crude; DII buying into PSU energy names. Key Stock: NTPC, COALINDIA" }
    ],
    "CURRENCY": [
      { "pair": "USD/INR", "value": "90.73", "change": "-0.34%", "signal": "Bullish for Nifty" }
    ],
    "GLOBAL_MARKETS": [
      { "region": "US (S&P 500)", "value": "5,088.80", "change": "+0.82%", "signal": "Positive Handover" }
    ],
    "SPECULATIONS": [
      { "theme": "US Tariff Adjustments on Tech", "news": "New speculative tariffs impact IT service exporters.", "stocks": "TCS, INFY", "reason": "Higher operational costs and visa restrictions directly threaten operating margins.", "sectorTrend": "Bearish", "stockTrend": "Oversold / Weak" }
    ],
    "LIVE_NEWS": [
      {
        "headline": "RBI Keeps Repo Rate Unchanged",
        "summary": "The Reserve Bank of India has decided to keep the repo rate unchanged at 6.5%, matching market expectations.",
        "impactedStocks": ["HDFCBANK", "ICICIBANK", "SBIN"],
        "sentiment": "Bullish"
      },
      {
        "headline": "Government Announces New EV Subsidies",
        "summary": "A fresh round of subsidies for electric vehicle manufacturers aims to boost domestic production and sales.",
        "impactedStocks": ["TATAMOTORS", "M&M", "OLECTRA"],
        "sentiment": "Bullish"
      }
    ]
  };
}
