const https = require('https');
const fs = require('fs');

const url = 'https://rynajg.vercel.app/api/scrape';

console.log('Fetching data from Vercel API...');

https.get(url, (res) => {
    let rawData = '';
    res.on('data', (chunk) => rawData += chunk);
    res.on('end', () => {
        try {
            const result = JSON.parse(rawData);
            if (!result.success || !result.data) {
                console.error('Failed to get data from API');
                return;
            }

            const history = {};
            result.data.forEach(item => {
                if (!item.id || item.actual === '-' || !item.date) return;
                
                const id = item.id.toString();
                if (!history[id]) history[id] = [];
                
                // Convert back to scraped_history format
                // { date: "Mar 12, 2026", actual: "0.3%", forecast: "0.2%", previous: "0.4%" }
                history[id].push({
                    date: item.date,
                    actual: item.actual,
                    forecast: item.forecast,
                    previous: item.last
                });
            });

            // Sort by date descending within each indicator
            // This isn't strictly necessary but keeps it clean
            Object.keys(history).forEach(id => {
                history[id].sort((a, b) => new Date(b.date) - new Date(a.date));
            });

            fs.writeFileSync('scraped_history.json', JSON.stringify(history, null, 4));
            console.log(`Successfully reconstructed scraped_history.json with ${Object.keys(history).length} indicators!`);
        } catch (e) {
            console.error('Error parsing/saving data:', e.message);
        }
    });
}).on('error', (e) => {
    console.error('Request error:', e.message);
});
