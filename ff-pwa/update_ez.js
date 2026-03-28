/**
 * update_ez.js
 * Scrapes historical data from ForexFactory for:
 * Euro Area (201-208)
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');
const fs = require('fs');

const targetIndicators = [
    { "id": 201, "name": "EZ ECB Main Refinancing Rate", category: "Euro Area", "refUrl": "https://www.forexfactory.com/calendar/12-ez-main-refinancing-rate" },
    { "id": 202, "name": "CPI y/y", category: "Euro Area", "refUrl": "https://www.forexfactory.com/calendar/166-ez-final-cpi-yy" },
    { "id": 203, "name": "Core CPI y/y", category: "Euro Area", "refUrl": "https://www.forexfactory.com/calendar/167-ez-final-core-cpi-yy" },
    { "id": 204, "name": "PPI m/m", category: "Euro Area", "refUrl": "https://www.forexfactory.com/calendar/89-ez-ppi-mm" },
    { "id": 205, "name": "Flash GDP q/q", category: "Euro Area", "refUrl": "https://www.forexfactory.com/calendar/41-ez-flash-gdp-qq" },
    { "id": 206, "name": "Retail Sales m/m", category: "Euro Area", "refUrl": "https://www.forexfactory.com/calendar/106-ez-retail-sales-mm" },
    { "id": 207, "name": "Unemployment Rate", category: "Euro Area", "refUrl": "https://www.forexfactory.com/calendar/59-ez-unemployment-rate" },
    { "id": 208, "name": "Employment Change q/q", category: "Euro Area", "refUrl": "https://www.forexfactory.com/calendar/69-ez-final-employment-change-qq" }
];

const scrapeIndicatorHistory = async (indicator) => {
    const maxRetries = 2;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const url = indicator.refUrl;
            console.log(`[Euro Area] Scraping ${indicator.name} (id=${indicator.id}, attempt=${attempt}/${maxRetries})...`);
            
            const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
            const html = await cloudscraper.get({
                url: proxyUrl,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                }
            });

            if (html.includes('calendarhistory')) {
                const $ = cheerio.load(html);
                let historyList = [];
                const rows = $('table.calendarhistory tbody tr');

                rows.each((i, el) => {
                    const dateCell = $(el).find('td.calendarhistory__row--history');
                    const dateText = dateCell.find('a').length > 0
                        ? dateCell.find('a').text().trim()
                        : dateCell.text().replace(/.*?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/, "$1").trim();

                    const actualText   = $(el).find('td.calendarhistory__row--actual').text().replace(/[^0-9.\-%<BKM]/g, '').trim();
                    const forecastText = $(el).find('td.calendarhistory__row--forecast').text().replace(/[^0-9.\-%<BKM]/g, '').trim();
                    const prevText     = $(el).find('td.calendarhistory__row--previous').text().replace(/[^0-9.\-%<BKM]/g, '').trim();

                    const match = dateText.match(/([A-Z][a-z]{2})\s+(\d{1,2}),\s+(\d{4})/);
                    if (match && actualText) {
                        historyList.push({
                            date: match[0],
                            actual: actualText,
                            forecast: forecastText,
                            previous: prevText,
                            movementBefore: "",
                            movementAfter: ""
                        });
                    }
                });

                if (historyList.length > 0) {
                    console.log(`  ✓ ${historyList.length} records found`);
                    return historyList;
                }
            }
            
            console.log(`  ⚠ Redirected or No records found (attempt ${attempt})`);
            const waitTime = 5000 + Math.random() * 5000;
            await new Promise(resolve => setTimeout(resolve, waitTime));

        } catch (err) {
            console.error(`  ✗ Error on attempt ${attempt}:`, err.message);
            if (attempt === maxRetries) return [];
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    return [];
};

const run = async () => {
    let history = {};
    const historyFile = 'scraped_history.json';
    if (fs.existsSync(historyFile)) {
        history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
    }

    for (const ind of targetIndicators) {
        const interDelay = 5000 + Math.random() * 3000;
        await new Promise(r => setTimeout(r, interDelay));
        const data = await scrapeIndicatorHistory(ind);
        if (data && data.length > 0) {
            history[ind.id] = data;
            fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
            console.log(`  → Saved ${data.length} records for [${ind.id}] ${ind.name}\n`);
        }
    }
    console.log(`\n✅ Done! Euro Area updated.`);
};

run();
