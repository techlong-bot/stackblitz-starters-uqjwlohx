const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.static('public'));

app.get('/market-data', async (req, res) => {
    try {
        // 1. Get real coin data AND price change
        const response = await axios.get(
            'https://api.coingecko.com/api/v3/coins/markets', 
            {
                params: {
                    vs_currency: 'usd',
                    order: 'market_cap_desc',
                    per_page: 25,
                    page: 1,
                    sparkline: false
                }
            }
        );

        const coins = response.data;

        // 2. The Logic: React to REAL price changes
        const enrichedData = coins.map(coin => {
            const priceChange = coin.price_change_percentage_24h;
            
            // Default values
            let netflow = 0; // Simulated whale movement
            let signal = "NEUTRAL";
            let signalColor = "gray";

            // If price crashed more than 2% -> Whales are Buying the Dip!
            if (priceChange < -2.0) {
                signal = "BUY THE DIP";
                signalColor = "#00ff00"; // Green
                // Simulate Negative Netflow (Outflow)
                netflow = Math.floor(Math.random() * -500) - 200; 
            }
            // If price pumped more than 2% -> Whales are Selling Top!
            else if (priceChange > 2.0) {
                signal = "TAKE PROFIT";
                signalColor = "#ff4d4d"; // Red
                // Simulate Positive Netflow (Inflow)
                netflow = Math.floor(Math.random() * 500) + 200; 
            }
            // If market is flat (-2% to 2%) -> Random noise
            else {
                netflow = Math.floor(Math.random() * 200) - 100;
            }

            return {
                name: coin.name,
                symbol: coin.symbol.toUpperCase(),
                price: coin.current_price,
                change24h: priceChange, // We send this to the frontend now
                image: coin.image,
                netflow: netflow,
                signal: signal,
                signalColor: signalColor
            };
        });

        res.json(enrichedData);

    } catch (error) {
        console.error("Error fetching data:", error.message);
        res.status(500).json({ error: "Failed to fetch data" });
    }
});

app.listen(3000, () => {
    console.log("Server running...");
});