const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.static('public'));

// --- CACHE STORAGE ---
let cache = {
    data: null,      // Stores the list of coins
    lastFetch: 0     // Stores the time (in ms) when we last fetched
};

// Function to fetch data with protection (Cache)
async function getCachedMarketData() {
    const now = Date.now();
    const ONE_MINUTE = 60 * 1000; 

    // 1. If we have data and it is less than 1 minute old, return it!
    if (cache.data && (now - cache.lastFetch < ONE_MINUTE)) {
        console.log("Serving from Cache (No Binance request)");
        return cache.data;
    }

    // 2. Otherwise, fetch new data from Binance
    console.log("Fetching new data from Binance...");
    try {
        const response = await axios.get('https://api.binance.com/api/v3/ticker/24hr');
        const allCoins = response.data;

        // Process the data
        const topCoins = allCoins
            .filter(coin => coin.symbol.endsWith('USDT'))
            .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
            .slice(0, 25);

        const enrichedData = topCoins.map(coin => {
            const shortSymbol = coin.symbol.replace('USDT', '');
            const priceChange = parseFloat(coin.priceChangePercent);
            
            let netflow = 0;
            let signal = "NEUTRAL";
            let signalColor = "gray";

            if (priceChange < -2.5) {
                signal = "BUY THE DIP";
                signalColor = "#00ff00"; // Green
                netflow = Math.floor(Math.random() * -500) - 200; 
            } else if (priceChange > 2.5) {
                signal = "TAKE PROFIT";
                signalColor = "#ff4d4d"; // Red
                netflow = Math.floor(Math.random() * 500) + 200; 
            } else {
                netflow = Math.floor(Math.random() * 200) - 100;
            }

            return {
                name: shortSymbol, 
                symbol: coin.symbol, 
                price: parseFloat(coin.lastPrice),
                change24h: priceChange,
                image: `https://assets.coincap.io/assets/icons/${shortSymbol.toLowerCase()}@2x.png`,
                netflow: netflow,
                signal: signal,
                signalColor: signalColor
            };
        });

        // Save to cache
        cache.data = enrichedData;
        cache.lastFetch = now;
        
        return enrichedData;

    } catch (error) {
        // If Binance blocks us, return old data if we have it
        if (cache.data) return cache.data;
        throw error;
    }
}

app.get('/market-data', async (req, res) => {
    try {
        const data = await getCachedMarketData();
        res.json(data);
    } catch (error) {
        console.error("Error fetching data:", error.message);
        // Send a friendly error to the website instead of crashing
        res.status(500).json({ error: "Market data temporarily unavailable. Try again in 1 min." });
    }
});

app.listen(3000, () => {
    console.log("Smart Server running. Cache enabled.");
});