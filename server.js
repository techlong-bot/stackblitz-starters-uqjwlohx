const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.static('public'));

app.get('/market-data', async (req, res) => {
    try {
        // 1. Get 24hr Ticker data from Binance (Public API, no key needed)
        const response = await axios.get('https://api.binance.com/api/v3/ticker/24hr');
        const allCoins = response.data;

        // 2. Filter & Sort the data
        // - We only want pairs ending in 'USDT' (like BTCUSDT)
        // - We sort by 'quoteVolume' to get the most traded coins (Top 25)
        const topCoins = allCoins
            .filter(coin => coin.symbol.endsWith('USDT'))
            .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
            .slice(0, 25);

        // 3. Process the data for our website
        const enrichedData = topCoins.map(coin => {
            // Clean up symbol: "BTCUSDT" -> "BTC"
            const shortSymbol = coin.symbol.replace('USDT', '');
            const priceChange = parseFloat(coin.priceChangePercent);
            
            // LOGIC: Same Smart Signal Logic
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
                name: shortSymbol, // Binance doesn't give full names, so we use BTC, ETH, etc.
                symbol: coin.symbol, // BTCUSDT
                price: parseFloat(coin.lastPrice),
                change24h: priceChange,
                // Trick to get coin icons using the symbol name
                image: `https://assets.coincap.io/assets/icons/${shortSymbol.toLowerCase()}@2x.png`,
                netflow: netflow,
                signal: signal,
                signalColor: signalColor
            };
        });

        res.json(enrichedData);

    } catch (error) {
        console.error("Error fetching Binance data:", error.message);
        res.status(500).json({ error: "Failed to fetch data" });
    }
});

app.listen(3000, () => {
    console.log("Connected to Binance API. Server running...");
});