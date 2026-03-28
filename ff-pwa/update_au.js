/**
 * update_au.js
 * Scrapes historical data from ForexFactory for:
 * Australia (101-107)
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');
const fs = require('fs');

const targetIndicators = [
    { id: 101, name: "RBA Rate Statement", category: "Australia", refUrl: "https://www.forexfactory.com/calendar/21-au-cash-rate" },
    { id: 102, name: "CPI m/m", category: "Australia", refUrl: "https://www.forexfactory.com/calendar/98-au-cpi-mm" },
    { id: 103, name: "PPI q/q", category: "Australia", refUrl: "https://www.forexfactory.com/calendar/97-au-ppi-qq" },
    { id: 104, name: "GDP q/q", category: "Australia", refUrl: "https://www.forexfactory.com/calendar/31-au-gdp-qq" },
    { id: 105, name: "Retail Sales m/m", category: "Australia", refUrl: "https://www.forexfactory.com/calendar/110-au-retail-sales-mm" },
    { id: 106, name: "Unemployment Rate", category: "Australia", refUrl: "https://www.forexfactory.com/calendar/64-au-unemployment-rate" },
    { id: 107, name: "Employment Change", category: "Australia", refUrl: "https://www.forexfactory.com/calendar/73-au-employment-change" }
];

const scrapeIndicatorHistory = async (indicator) => {
    const maxRetries = 2;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const url = indicator.refUrl;
            console.log(`[Australia] Scraping ${indicator.name} (id=${indicator.id}, attempt=${attempt}/${maxRetries})...`);
            
            const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
            const html = await cloudscraper.get({
                url: proxyUrl,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                }
            });

            if (html.includes('calendarhistory')) {
                const $ = cheerio.lazy(html);
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
    console.log(`\n✅ Done! Australia updated.`);
};

run();
