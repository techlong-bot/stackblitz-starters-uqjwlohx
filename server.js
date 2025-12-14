const express = require('express');
const app = express();
const path = require('path');

// Serve the website files
app.use(express.static('public'));

// If anyone goes to the homepage, give them index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(3000, () => {
    console.log("Server is running. Data fetching moved to frontend.");
});