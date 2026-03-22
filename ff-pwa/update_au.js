process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');
const fs = require('fs');

const targetIndicators = [
    { id: 101, name: "RBA Rate Statement", category: "Australia", refUrl: "https://www.forexfactory.com/calendar/22-au-rba-rate-statement" },
    { id: 102, name: "CPI q/q", category: "Australia", refUrl: "https://www.forexfactory.com/calendar/38-au-cpi-qq" },
    { id: 103, name: "PPI q/q", category: "Australia", refUrl: "https://www.forexfactory.com/calendar/37-au-ppi-qq" },
    { id: 104, name: "GDP q/q", category: "Australia", refUrl: "https://www.forexfactory.com/calendar/31-au-gdp-qq" },
    { id: 105, name: "Retail Sales m/m", category: "Australia", refUrl: "https://www.forexfactory.com/calendar/110-au-retail-sales-mm" },
    { id: 106, name: "Unemployment Rate", category: "Australia", refUrl: "https://www.forexfactory.com/calendar/54-au-unemployment-rate" },
    { id: 107, name: "Employment Change", category: "Australia", refUrl: "https://www.forexfactory.com/calendar/73-au-employment-change" }
];

const scrapeIndicatorHistory = async (indicator) => {
    try {
        console.log(`Scraping ${indicator.name}...`);
        const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(indicator.refUrl);
        const html = await cloudscraper.get({
            url: proxyUrl,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });
        const $ = cheerio.load(html);
        
        let historyList = [];
        
        const rows = $('table.calendarhistory tbody tr');
        
        if (rows.length === 0) {
           console.log(`No rows found for ${indicator.name}. Table structure might have changed or blocked.`);
           fs.writeFileSync('debug.html', html);
        }

        rows.each((i, el) => {
            const dateCell = $(el).find('td.calendarhistory__row--history');
            const dateText = dateCell.find('a').length > 0 ? dateCell.find('a').text().trim() : dateCell.text().replace(/.*?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/, "$1").trim();
            
            const actualText = $(el).find('td.calendarhistory__row--actual').text().replace(/[^0-9.\-%<BKM]/g, '').trim();
            const forecastText = $(el).find('td.calendarhistory__row--forecast').text().replace(/[^0-9.\-%<BKM]/g, '').trim();
            const prevText = $(el).find('td.calendarhistory__row--previous').text().replace(/[^0-9.\-%<BKM]/g, '').trim();
            
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
        
        return historyList;
    } catch (e) {
        console.error(`Error scraping ${indicator.name}:`, e.message);
        return [];
    }
};

const run = async () => {
    let history = {};
    if (fs.existsSync('scraped_history.json')) {
        history = JSON.parse(fs.readFileSync('scraped_history.json', 'utf8'));
    }
    
    for (const ind of targetIndicators) {
        const data = await scrapeIndicatorHistory(ind);
        if (data.length > 0) {
            history[ind.id] = data;
            console.log(`Saved ${data.length} records for ${ind.name}`);
        }
        await new Promise(r => setTimeout(r, 2000));
    }
    
    fs.writeFileSync('scraped_history.json', JSON.stringify(history, null, 2));
    console.log("Done");
};

run();
