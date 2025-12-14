const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.static('public'));

// --- CACHE (Keeps data for 1 min to prevent errors) ---
let cache = {
    data: null,
    lastFetch: 0
};

async function getMarketData() {
    const now = Date.now();
    // 1. Return saved data if it's fresh (less than 60 seconds old)
    if (cache.data && (now - cache.lastFetch < 60000)) {
        console.log("Serving from Cache");
        return cache.data;
    }

    // 2. Fetch from CoinCap (More reliable than Binance for servers)
    console.log("Fetching new data from CoinCap...");
    try {
        const response = await axios.get('https://api.coincap.io/v2/assets?limit=25');
        const allCoins = response.data.data; // CoinCap puts the list inside .data

        const enrichedData = allCoins.map(coin => {
            const priceChange = parseFloat(coin.changePercent24Hr);
            
            // SIGNAL LOGIC
            let signal = "NEUTRAL";
            let signalColor = "gray";

            if (priceChange < -2.5) {
                signal = "BUY THE DIP";
                signalColor = "#00ff00"; // Green
            } else if (priceChange > 2.5) {
                signal = "TAKE PROFIT";
                signalColor = "#ff4d4d"; // Red
            }

            return {
                name: coin.symbol, // BTC, ETH, etc.
                fullName: coin.name, // Bitcoin, Ethereum
                price: parseFloat(coin.priceUsd),
                change24h: priceChange,
                // Get icon from CoinCap's image server
                image: `https://assets.coincap.io/assets/icons/${coin.symbol.toLowerCase()}@2x.png`,
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
        // If API fails, return the old data if we have it
        if (cache.data) return cache.data;
        throw error;
    }
}

app.get('/market-data', async (req, res) => {
    try {
        const data = await getMarketData();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Data unavailable. Try again later." });
    }
});

app.listen(3000, () => {
    console.log("Server running with CoinCap API.");
});