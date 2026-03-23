/**
 * update_others.js
 * Scrapes historical data from ForexFactory for:
 * UK (301-307), Japan (401-407), New Zealand (501-507), Swiss (601-606), Canada (701-707)
 * Run: node update_others.js
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');
const fs = require('fs');

const targetIndicators = [
    // United Kingdom (UK)
    { id: 301, name: "UK Official Bank Rate", category: "United Kingdom", refUrl: "https://www.forexfactory.com/calendar/15-uk-official-bank-rate" },
    { id: 302, name: "CPI y/y", category: "United Kingdom", refUrl: "https://www.forexfactory.com/calendar/82-uk-cpi-yy" },
    { id: 303, name: "Core CPI y/y", category: "United Kingdom", refUrl: "https://www.forexfactory.com/calendar/83-uk-core-cpi-yy" },
    { id: 304, name: "PPI m/m", category: "United Kingdom", refUrl: "https://www.forexfactory.com/calendar/93-uk-ppi-output-mm" },
    { id: 305, name: "GDP m/m", category: "United Kingdom", refUrl: "https://www.forexfactory.com/calendar/804-uk-gdp-mm" },
    { id: 306, name: "Retail Sales m/m", category: "United Kingdom", refUrl: "https://www.forexfactory.com/calendar/105-uk-retail-sales-mm" },
    { id: 307, name: "Unemployment Rate", category: "United Kingdom", refUrl: "https://www.forexfactory.com/calendar/58-uk-unemployment-rate" },

    // Japan (JN)
    { id: 401, name: "JN BOJ Policy Rate", category: "Japan", refUrl: "https://www.forexfactory.com/calendar/641-jn-boj-policy-rate" },
    { id: 402, name: "National Core CPI y/y", category: "Japan", refUrl: "https://www.forexfactory.com/calendar/174-jn-national-core-cpi-yy" },
    { id: 403, name: "BOJ Core CPI y/y", category: "Japan", refUrl: "https://www.forexfactory.com/calendar/631-jn-boj-core-cpi-yy" },
    { id: 404, name: "PPI y/y", category: "Japan", refUrl: "https://www.forexfactory.com/calendar/148-jn-ppi-yy" },
    { id: 405, name: "Prelim GDP y/y", category: "Japan", refUrl: "https://www.forexfactory.com/calendar/43-jn-prelim-gdp-price-index-yy" },
    { id: 406, name: "Retail Sales y/y", category: "Japan", refUrl: "https://www.forexfactory.com/calendar/115-jn-retail-sales-yy" },
    { id: 407, name: "Unemployment Rate", category: "Japan", refUrl: "https://www.forexfactory.com/calendar/63-jn-unemployment-rate" },

    // New Zealand (NZ)
    { id: 501, name: "NZ Official Cash Rate", category: "New Zealand", refUrl: "https://www.forexfactory.com/calendar/23-nz-official-cash-rate" },
    { id: 502, name: "NZ CPI q/q", category: "New Zealand", refUrl: "https://www.forexfactory.com/calendar/173-nz-cpi-qq" },
    { id: 503, name: "NZ PPI q/q", category: "New Zealand", refUrl: "https://www.forexfactory.com/calendar/94-nz-ppi-input-qq" },
    { id: 504, name: "NZ GDP q/q", category: "New Zealand", refUrl: "https://www.forexfactory.com/calendar/30-nz-gdp-qq" },
    { id: 505, name: "NZ Retail Sales q/q", category: "New Zealand", refUrl: "https://www.forexfactory.com/calendar/510-nz-retail-sales-qq" },
    { id: 506, name: "Employment Change q/q", category: "New Zealand", refUrl: "https://www.forexfactory.com/calendar/74-nz-employment-change-qq" },
    { id: 507, name: "Unemployment Rate q/q", category: "New Zealand", refUrl: "https://www.forexfactory.com/calendar/65-nz-unemployment-rate" },

    // Swiss - SZ (SNB)
    { id: 601, name: "SZ SNB Policy Rate", category: "Swiss", refUrl: "https://www.forexfactory.com/calendar/834-sz-snb-policy-rate" },
    { id: 602, name: "SZ CPI m/m", category: "Swiss", refUrl: "https://www.forexfactory.com/calendar/100-sz-cpi-mm" },
    { id: 603, name: "SZ PPI m/m", category: "Swiss", refUrl: "https://www.forexfactory.com/calendar/96-sz-ppi-mm" },
    { id: 604, name: "SZ GDP q/q", category: "Swiss", refUrl: "https://www.forexfactory.com/calendar/32-sz-gdp-qq" },
    { id: 605, name: "SZ Retail Sales q/q", category: "Swiss", refUrl: "https://www.forexfactory.com/calendar/109-sz-retail-sales-yy" },
    { id: 606, name: "Unemployment Rate m/m", category: "Swiss", refUrl: "https://www.forexfactory.com/calendar/62-sz-unemployment-rate" },

    // Canada (CA)
    { id: 701, name: "CA Overnight Rate", category: "Canada", refUrl: "https://www.forexfactory.com/calendar/13-ca-overnight-rate" },
    { id: 702, name: "CA CPI m/m", category: "Canada", refUrl: "https://www.forexfactory.com/calendar/80-ca-cpi-mm" },
    { id: 703, name: "CA IPPI m/m", category: "Canada", refUrl: "https://www.forexfactory.com/calendar/90-ca-ippi-mm" },
    { id: 704, name: "CA GDP m/m", category: "Canada", refUrl: "https://www.forexfactory.com/calendar/29-ca-gdp-mm" },
    { id: 705, name: "CA Retail Sales m/m", category: "Canada", refUrl: "https://www.forexfactory.com/calendar/104-ca-retail-sales-mm" },
    { id: 706, name: "Employment Change", category: "Canada", refUrl: "https://www.forexfactory.com/calendar/67-ca-employment-change" },
    { id: 707, name: "Unemployment Rate m/m", category: "Canada", refUrl: "https://www.forexfactory.com/calendar/57-ca-unemployment-rate" }
];

const scrapeIndicatorHistory = async (indicator) => {
    try {
        console.log(`[${indicator.category}] Scraping ${indicator.name} (id=${indicator.id})...`);
        const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(indicator.refUrl);
        const html = await cloudscraper.get({
            url: proxyUrl,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const $ = cheerio.load(html);

        let historyList = [];
        const rows = $('table.calendarhistory tbody tr');

        if (rows.length === 0) {
            console.log(`  ⚠ No rows found for ${indicator.name}. Writing debug_${indicator.id}.html`);
            fs.writeFileSync(`debug_${indicator.id}.html`, html);
        }

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

        console.log(`  ✓ ${historyList.length} records found`);
        return historyList;
    } catch (e) {
        console.error(`  ✗ Error scraping ${indicator.name}:`, e.message);
        return [];
    }
};

const run = async () => {
    let history = {};
    const historyFile = 'scraped_history.json';
    if (fs.existsSync(historyFile)) {
        history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
        console.log(`Loaded existing scraped_history.json (${Object.keys(history).length} indicators)`);
    }

    for (const ind of targetIndicators) {
        const data = await scrapeIndicatorHistory(ind);
        if (data.length > 0) {
            history[ind.id] = data;
            console.log(`  → Saved ${data.length} records for [${ind.id}] ${ind.name}\n`);
        } else {
            console.log(`  → No data saved for [${ind.id}] ${ind.name}\n`);
        }
        // Delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 2500));
    }

    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
    console.log(`\n✅ Done! scraped_history.json updated with ${Object.keys(history).length} total indicators.`);
};

run();
