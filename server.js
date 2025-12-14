const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.static('public'));

// --- CACHE SYSTEM (Prevents being banned) ---
let cache = {
    data: null,
    lastFetch: 0
};

async function getMarketData() {
    const now = Date.now();
    // 1. If we have data less than 60 seconds old, use it (Save API calls)
    if (cache.data && (now - cache.lastFetch < 60000)) {
        console.log("Serving from Cache 📦");
        return cache.data;
    }

    // 2. Fetch fresh data from CoinGecko (Most reliable for free tier)
    console.log("Fetching new data from CoinGecko 🦎...");
    try {
        const response = await axios.get(
            'https://api.coingecko.com/api/v3/coins/markets', 
            {
                params: {
                    vs_currency: 'usd',
                    order: 'market_cap_desc',
                    per_page: 25,
                    page: 1,
                    sparkline: false
                },
                // Add a fake header so they think we are a real browser
                headers: { 'User-Agent': 'Mozilla/5.0' }
            }
        );

        const coins = response.data;

        const enrichedData = coins.map(coin => {
            const priceChange = coin.price_change_percentage_24h;
            
            // SIGNAL LOGIC
            let signal = "NEUTRAL";
            let signalColor = "gray";

            if (priceChange < -2.0) {
                signal = "BUY THE DIP";
                signalColor = "#00ff00"; // Green
            } else if (priceChange > 2.0) {
                signal = "TAKE PROFIT";
                signalColor = "#ff4d4d"; // Red
            }

            return {
                name: coin.symbol.toUpperCase(),
                fullName: coin.name,
                price: coin.current_price,
                change24h: priceChange,
                image: coin.image, // CoinGecko gives us the real logo!
                signal: signal,
                signalColor: signalColor
            };
        });

        // Save to cache
        cache.data = enrichedData;
        cache.lastFetch = now;
        return enrichedData;

    } catch (error) {
        console.error("API Error:", error.message);
        // If the API fails, return the old data so the site doesn't crash
        if (cache.data) return cache.data;
        throw error;
    }
}

app.get('/market-data', async (req, res) => {
    try {
        const data = await getMarketData();
        res.json(data);
    } catch (error) {
        // Only shows if we have NO data at all
        res.status(500).json({ error: "Market data initializing. Please wait..." });
    }
});

app.listen(3000, () => {
    console.log("Server running. Powered by CoinGecko.");
});