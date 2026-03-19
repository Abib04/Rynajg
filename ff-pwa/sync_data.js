const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// Bypass SSL certificate validation for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const targetIndicators = [
    { id: 1, name: "CPI (Consumer Price Index)", refUrl: "https://www.forexfactory.com/calendar/78-us-cpi-mm" },
    { id: 2, name: "Core CPI", refUrl: "https://www.forexfactory.com/calendar/79-us-core-cpi-mm" },
    { id: 3, name: "PPI (Producer Price Index)", refUrl: "https://www.forexfactory.com/calendar/86-us-ppi-mm" },
    { id: 4, name: "Core PPI (Producer Price Index)", refUrl: "https://www.forexfactory.com/calendar/87-us-core-ppi-mm" },
    { id: 5, name: "Import/Export Prices", refUrl: "https://www.forexfactory.com/calendar/90-us-import-prices-mm" },
    { id: 6, name: "PCE/Core PCE", refUrl: "https://www.forexfactory.com/calendar/85-us-core-pce-price-index-mm" },
    { id: 7, name: "Non-farm Payrolls", refUrl: "https://www.forexfactory.com/calendar/66-us-non-farm-employment-change" },
    { id: 8, name: "Non-Farm Employment Change", refUrl: "https://www.forexfactory.com/calendar/66-us-non-farm-employment-change" },
    { id: 9, name: "Unemployment Rate", refUrl: "https://www.forexfactory.com/calendar/56-us-unemployment-rate" },
    { id: 10, name: "Employment Change", refUrl: "https://www.forexfactory.com/calendar/66-us-non-farm-employment-change" },
    { id: 11, name: "Average Hourly Earnings", refUrl: "https://www.forexfactory.com/calendar/159-us-average-hourly-earnings-mm" },
    { id: 12, name: "Unemployment Claims (W1)", refUrl: "https://www.forexfactory.com/calendar/11-us-unemployment-claims" },
    { id: 13, name: "Unemployment Claims (W2)", refUrl: "https://www.forexfactory.com/calendar/11-us-unemployment-claims" },
    { id: 14, name: "Unemployment Claims (W3)", refUrl: "https://www.forexfactory.com/calendar/11-us-unemployment-claims" },
    { id: 15, name: "Unemployment Claims (W4)", refUrl: "https://www.forexfactory.com/calendar/11-us-unemployment-claims" },
    { id: 16, name: "ADP Non-Farm Employment Change", refUrl: "https://www.forexfactory.com/calendar/75-us-adp-non-farm-employment-change" },
    { id: 17, name: "GDP (q/q)", refUrl: "https://www.forexfactory.com/calendar/81-us-gdp-qq" },
    { id: 18, name: "Final GDP", refUrl: "https://www.forexfactory.com/calendar/81-us-gdp-qq" },
    { id: 19, name: "Flash GDP", refUrl: "https://www.forexfactory.com/calendar/81-us-gdp-qq" },
    { id: 20, name: "Industrial Production", refUrl: "https://www.forexfactory.com/calendar/111-us-industrial-production-mm" },
    { id: 21, name: "Capacity Utilization", refUrl: "https://www.forexfactory.com/calendar/112-us-capacity-utilization-rate" },
    { id: 22, name: "Retail Sales", refUrl: "https://www.forexfactory.com/calendar/102-us-retail-sales-mm" },
    { id: 23, name: "Core Retail Sales", refUrl: "https://www.forexfactory.com/calendar/112-us-core-retail-sales-mm" },
    { id: 24, name: "Personal Spending", refUrl: "https://www.forexfactory.com/calendar/356-us-personal-spending-mm" },
    { id: 25, name: "Personal Income", refUrl: "https://www.forexfactory.com/calendar/360-us-personal-income-mm" },
    { id: 26, name: "US ISM Manufacturing PMI", refUrl: "https://www.forexfactory.com/calendar/252-us-ism-manufacturing-pmi" },
    { id: 27, name: "US ISM Services PMI", refUrl: "https://www.forexfactory.com/calendar/253-us-ism-services-pmi" },
    { id: 28, name: "Composite PMI", refUrl: "https://www.forexfactory.com/calendar/113-us-flash-manufacturing-pmi" },
    { id: 29, name: "US CB Consumer Confidence", refUrl: "https://www.forexfactory.com/calendar/208-us-cb-consumer-confidence" },
    { id: 30, name: "Business Confidence", refUrl: "https://www.forexfactory.com/calendar/114-us-business-inventories-mm" },
    { id: 31, name: "ZEW Economic Sentiment", refUrl: "https://www.forexfactory.com/calendar/115-us-zew-economic-sentiment" },
    { id: 32, name: "Interest Rate Decision", refUrl: "https://www.forexfactory.com/calendar/1-us-federal-funds-rate" },
    { id: 33, name: "Monetary Policy Statement", refUrl: "https://www.forexfactory.com/calendar/1-us-federal-funds-rate" },
    { id: 34, name: "FOMC Minutes", refUrl: "https://www.forexfactory.com/calendar/2-us-fomc-minutes" },
    { id: 35, name: "Central Bank Press Conference", refUrl: "https://www.forexfactory.com/calendar/3-us-fomc-press-conference" },
    { id: 36, name: "Governor Speech", refUrl: "https://www.forexfactory.com/calendar/4-us-fed-chair-powell-speaks" },
    { id: 37, name: "Trade Balance", refUrl: "https://www.forexfactory.com/calendar/117-us-trade-balance" },
    { id: 38, name: "Current Account", refUrl: "https://www.forexfactory.com/calendar/118-us-current-account" },
    { id: 39, name: "Foreign Investment", refUrl: "https://www.forexfactory.com/calendar/119-us-tic-long-term-purchases" },
    { id: 40, name: "Capital Flows", refUrl: "https://www.forexfactory.com/calendar/119-us-tic-long-term-purchases" },
    { id: 41, name: "Bond Auctions (10Y)", refUrl: "https://www.forexfactory.com/calendar/519-us-10-y-bond-auction" },
    { id: 42, name: "Crude Oil Inventories (W1)", refUrl: "https://www.forexfactory.com/calendar/10-us-crude-oil-inventories" },
    { id: 43, name: "Crude Oil Inventories (W2)", refUrl: "https://www.forexfactory.com/calendar/10-us-crude-oil-inventories" },
    { id: 44, name: "Crude Oil Inventories (W3)", refUrl: "https://www.forexfactory.com/calendar/10-us-crude-oil-inventories" },
    { id: 45, name: "Crude Oil Inventories (W4)", refUrl: "https://www.forexfactory.com/calendar/10-us-crude-oil-inventories" },
    { id: 46, name: "Natural Gas Storage (W1)", refUrl: "https://www.forexfactory.com/calendar/26-us-natural-gas-storage" },
    { id: 47, name: "Natural Gas Storage (W2)", refUrl: "https://www.forexfactory.com/calendar/26-us-natural-gas-storage" },
    { id: 48, name: "Natural Gas Storage (W3)", refUrl: "https://www.forexfactory.com/calendar/26-us-natural-gas-storage" },
    { id: 49, name: "Natural Gas Storage (W4)", refUrl: "https://www.forexfactory.com/calendar/26-us-natural-gas-storage" },
    { id: 50, name: "Housing Starts", refUrl: "https://www.forexfactory.com/calendar/199-us-housing-starts" },
    { id: 51, name: "Building Permits", refUrl: "https://www.forexfactory.com/calendar/198-us-building-permits" },
    { id: 52, name: "Miscellaneous", refUrl: "https://www.forexfactory.com/" }
];

const scrapeIndicator = async (ind) => {
    if (!ind.refUrl || ind.refUrl === "https://www.forexfactory.com/") return [];
    console.log(`Scraping Indicator ${ind.id}: ${ind.name}...`);
    try {
        const html = await cloudscraper.get(ind.refUrl);
        const $ = cheerio.load(html);
        const results = [];
        
        // Look for the history table with multiple common selectors
        const table = $('.calendar__table, .calendar-history__table, table.calendar__history, .history__table').first();
        if (!table.length) {
            console.log(`  No table found for ${ind.id}. HTML Preview: ${html.substring(0, 200).replace(/\s+/g, ' ')}`);
            return [];
        }

        table.find('tr').each((i, el) => {
            const row = $(el);
            // Combined selectors for flexibility
            const dateText = row.find('.calendar__date, .calendarhistory__date, .history__date, td:nth-child(1)').text().trim();
            const actual = row.find('.calendar__actual, .calendarhistory__actual, .history__actual, td:nth-child(6)').text().trim();
            const forecast = row.find('.calendar__forecast, .calendarhistory__forecast, .history__forecast, td:nth-child(7)').text().trim();
            const previous = row.find('.calendar__previous, .calendarhistory__previous, .history__previous, td:nth-child(8)').text().trim();

            if (dateText && actual && dateText.match(/[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}/)) {
                results.push({ date: dateText, actual, forecast, previous });
            }
        });
        
        console.log(`  Found ${results.length} rows for ${ind.id}`);
        return results;
    } catch (e) {
        console.error(`  Error scraping ${ind.id}: ${e.message}`);
        return [];
    }
};

const run = async () => {
    const historyPath = path.join(__dirname, 'scraped_history.json');
    let history = {};
    if (fs.existsSync(historyPath)) {
        try {
            history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
        } catch (e) { console.error("Corrupt JSON, starting fresh."); }
    }

    for (const ind of targetIndicators) {
        const rows = await scrapeIndicator(ind);
        if (rows.length > 0) {
            if (!history[ind.id]) history[ind.id] = [];
            rows.forEach(row => {
                if (!history[ind.id].some(e => e.date === row.date)) {
                    history[ind.id].push(row);
                }
            });
        }
    }

    fs.writeFileSync(historyPath, JSON.stringify(history, null, 4));
    console.log('Sync Complete!');
};

run();
