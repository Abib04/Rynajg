const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());

// The exact indicators user requested
const targetIndicators = [
    // Inflation & Prices
    { id: 1, name: "CPI (Consumer Price Index)", category: "Inflation & Prices", dateType: "specific", day: 12, refUrl: "https://www.forexfactory.com/calendar/78-us-cpi-mm" },
    { id: 2, name: "Core CPI", category: "Inflation & Prices", dateType: "specific", day: 12, refUrl: "https://www.forexfactory.com/calendar/79-us-core-cpi-mm" },
    { id: 3, name: "PPI (Producer Price Index)", category: "Inflation & Prices", dateType: "specific", day: 18, refUrl: "https://www.forexfactory.com/calendar/86-us-ppi-mm" },
    { id: 4, name: "Core PPI (Producer Price Index)", category: "Inflation & Prices", dateType: "specific", day: 18, refUrl: "https://www.forexfactory.com/calendar/87-us-core-ppi-mm" },
    { id: 5, name: "Import/Export Prices", category: "Inflation & Prices", dateType: "specific", day: 20, refUrl: "https://www.forexfactory.com/calendar/90-us-import-prices-mm" }, // inferred based on standard URL
    { id: 6, name: "PCE/Core PCE", category: "Inflation & Prices", dateType: "specific", day: 27, refUrl: "https://www.forexfactory.com/calendar/85-us-core-pce-price-index-mm" },

    // Labour
    { id: 7, name: "Non-farm Payrolls", category: "Labour", dateType: "specific", day: 6, refUrl: "https://www.forexfactory.com/calendar/66-us-non-farm-employment-change" },
    { id: 8, name: "Non-Farm Employment Change", category: "Labour", dateType: "specific", day: 6, refUrl: "https://www.forexfactory.com/calendar/66-us-non-farm-employment-change" },
    { id: 9, name: "Unemployment Rate", category: "Labour", dateType: "specific", day: 6, refUrl: "https://www.forexfactory.com/calendar/56-us-unemployment-rate" },
    { id: 10, name: "Employment Change", category: "Labour", dateType: "specific", day: 15, refUrl: "https://www.forexfactory.com/calendar/66-us-non-farm-employment-change" },
    { id: 11, name: "Average Hourly Earnings", category: "Labour", dateType: "specific", day: 6, refUrl: "https://www.forexfactory.com/calendar/159-us-average-hourly-earnings-mm" },
    { id: 12, name: "Unemployment Claims (W1)", category: "Labour", dateType: "specific", day: 5, refUrl: "https://www.forexfactory.com/calendar/11-us-unemployment-claims" },
    { id: 13, name: "Unemployment Claims (W2)", category: "Labour", dateType: "specific", day: 12, refUrl: "https://www.forexfactory.com/calendar/11-us-unemployment-claims" },
    { id: 14, name: "Unemployment Claims (W3)", category: "Labour", dateType: "specific", day: 19, refUrl: "https://www.forexfactory.com/calendar/11-us-unemployment-claims" },
    { id: 15, name: "Unemployment Claims (W4)", category: "Labour", dateType: "specific", day: 26, refUrl: "https://www.forexfactory.com/calendar/11-us-unemployment-claims" },
    { id: 16, name: "ADP Non-Farm Employment Change", category: "Labour", dateType: "specific", day: 5, refUrl: "https://www.forexfactory.com/calendar/75-us-adp-non-farm-employment-change" },

    // Economy Growth
    { id: 17, name: "GDP (q/q)", category: "Economy Growth", dateType: "specific", day: 25, refUrl: "https://www.forexfactory.com/calendar/81-us-gdp-qq" },
    { id: 18, name: "Final GDP", category: "Economy Growth", dateType: "specific", day: 25, refUrl: "https://www.forexfactory.com/calendar/81-us-gdp-qq" },
    { id: 19, name: "Flash GDP", category: "Economy Growth", dateType: "specific", day: 25, refUrl: "https://www.forexfactory.com/calendar/81-us-gdp-qq" },
    { id: 20, name: "Industrial Production", category: "Economy Growth", dateType: "specific", day: 15, refUrl: "https://www.forexfactory.com/calendar/111-us-industrial-production-mm" },
    { id: 21, name: "Capacity Utilization", category: "Economy Growth", dateType: "specific", day: 15, refUrl: "https://www.forexfactory.com/calendar/112-us-capacity-utilization-rate" },

    // Consumption & Domestic Demand
    { id: 22, name: "Retail Sales", category: "Consumption & Domestic Demand", dateType: "specific", day: 18, refUrl: "https://www.forexfactory.com/calendar/102-us-retail-sales-mm" },
    { id: 23, name: "Core Retail Sales", category: "Consumption & Domestic Demand", dateType: "specific", day: 18, refUrl: "https://www.forexfactory.com/calendar/112-us-core-retail-sales-mm" },
    { id: 24, name: "Personal Spending", category: "Consumption & Domestic Demand", dateType: "specific", day: 27, refUrl: "https://www.forexfactory.com/calendar/356-us-personal-spending-mm" },
    { id: 25, name: "Personal Income", category: "Consumption & Domestic Demand", dateType: "specific", day: 27, refUrl: "https://www.forexfactory.com/calendar/360-us-personal-income-mm" },

    // Sentiment & Survey
    { id: 26, name: "US ISM Manufacturing PMI", category: "Sentiment & Survey", dateType: "specific", day: 4, refUrl: "https://www.forexfactory.com/calendar/252-us-ism-manufacturing-pmi" },
    { id: 27, name: "US ISM Services PMI", category: "Sentiment & Survey", dateType: "specific", day: 6, refUrl: "https://www.forexfactory.com/calendar/253-us-ism-services-pmi" },
    { id: 28, name: "Composite PMI", category: "Sentiment & Survey", dateType: "specific", day: 4, refUrl: "https://www.forexfactory.com/calendar/113-us-flash-manufacturing-pmi" }, // assumed composite standard proxy
    { id: 29, name: "US CB Consumer Confidence", category: "Sentiment & Survey", dateType: "specific", day: 31, refUrl: "https://www.forexfactory.com/calendar/208-us-cb-consumer-confidence" },
    { id: 30, name: "Business Confidence", category: "Sentiment & Survey", dateType: "specific", day: 15, refUrl: "https://www.forexfactory.com/calendar/114-us-business-inventories-mm" }, // placeholder
    { id: 31, name: "ZEW Economic Sentiment", category: "Sentiment & Survey", dateType: "specific", day: 12, refUrl: "https://www.forexfactory.com/calendar/115-us-zew-economic-sentiment" }, // placeholder

    // Monetary Policy
    { id: 32, name: "Interest Rate Decision", category: "Monetary Policy", dateType: "specific", day: 15, refUrl: "https://www.forexfactory.com/calendar/1-us-federal-funds-rate" },
    { id: 33, name: "Monetary Policy Statement", category: "Monetary Policy", dateType: "specific", day: 15, refUrl: "https://www.forexfactory.com/calendar/1-us-federal-funds-rate" }, // Same as above conceptually
    { id: 34, name: "FOMC Minutes", category: "Monetary Policy", dateType: "specific", day: 22, refUrl: "https://www.forexfactory.com/calendar/2-us-fomc-minutes" }, // inferred
    { id: 35, name: "Central Bank Press Conference", category: "Monetary Policy", dateType: "specific", day: 15, refUrl: "https://www.forexfactory.com/calendar/3-us-fomc-press-conference" }, // inferred 
    { id: 36, name: "Governor Speech", category: "Monetary Policy", dateType: "specific", day: 8, refUrl: "https://www.forexfactory.com/calendar/4-us-fed-chair-powell-speaks" }, // inferred

    // Balance sheet & External Sector
    { id: 37, name: "Trade Balance", category: "Balance sheet & External Sector", dateType: "specific", day: 5, refUrl: "https://www.forexfactory.com/calendar/117-us-trade-balance" },
    { id: 38, name: "Current Account", category: "Balance sheet & External Sector", dateType: "specific", day: 15, refUrl: "https://www.forexfactory.com/calendar/118-us-current-account" }, // inferred
    { id: 39, name: "Foreign Investment", category: "Balance sheet & External Sector", dateType: "specific", day: 20, refUrl: "https://www.forexfactory.com/calendar/119-us-tic-long-term-purchases" }, // inferred
    { id: 40, name: "Capital Flows", category: "Balance sheet & External Sector", dateType: "specific", day: 20, refUrl: "https://www.forexfactory.com/calendar/119-us-tic-long-term-purchases" },

    // Others
    { id: 41, name: "Bond Auctions (10Y)", category: "Others", dateType: "specific", day: 12, refUrl: "https://www.forexfactory.com/calendar/519-us-10-y-bond-auction" },
    { id: 42, name: "Crude Oil Inventories (W1)", category: "Others", dateType: "specific", day: 5, refUrl: "https://www.forexfactory.com/calendar/10-us-crude-oil-inventories" },
    { id: 43, name: "Crude Oil Inventories (W2)", category: "Others", dateType: "specific", day: 11, refUrl: "https://www.forexfactory.com/calendar/10-us-crude-oil-inventories" },
    { id: 44, name: "Crude Oil Inventories (W3)", category: "Others", dateType: "specific", day: 19, refUrl: "https://www.forexfactory.com/calendar/10-us-crude-oil-inventories" },
    { id: 45, name: "Crude Oil Inventories (W4)", category: "Others", dateType: "specific", day: 25, refUrl: "https://www.forexfactory.com/calendar/10-us-crude-oil-inventories" },
    { id: 46, name: "Natural Gas Storage (W1)", category: "Others", dateType: "specific", day: 5, refUrl: "https://www.forexfactory.com/calendar/26-us-natural-gas-storage" },
    { id: 47, name: "Natural Gas Storage (W2)", category: "Others", dateType: "specific", day: 12, refUrl: "https://www.forexfactory.com/calendar/26-us-natural-gas-storage" },
    { id: 48, name: "Natural Gas Storage (W3)", category: "Others", dateType: "specific", day: 19, refUrl: "https://www.forexfactory.com/calendar/26-us-natural-gas-storage" },
    { id: 49, name: "Natural Gas Storage (W4)", category: "Others", dateType: "specific", day: 26, refUrl: "https://www.forexfactory.com/calendar/26-us-natural-gas-storage" },
    { id: 50, name: "Housing Starts", category: "Others", dateType: "specific", day: 19, refUrl: "https://www.forexfactory.com/calendar/199-us-housing-starts" },
    { id: 51, name: "Building Permits", category: "Others", dateType: "specific", day: 19, refUrl: "https://www.forexfactory.com/calendar/198-us-building-permits" },
    // Only 51 listed in image, omitting 52 for alignment, or mapping it similarly
    { id: 52, name: "Miscellaneous", category: "Others", dateType: "specific", day: 15, refUrl: "https://www.forexfactory.com/" },

    // Australia
    { id: 101, name: "RBA Rate Statement", category: "Australia", dateType: "specific", day: 1, refUrl: "https://www.forexfactory.com/calendar/22-au-rba-rate-statement" },
    { id: 102, name: "CPI q/q", category: "Australia", dateType: "specific", day: 1, refUrl: "https://www.forexfactory.com/calendar/38-au-cpi-qq" },
    { id: 103, name: "PPI q/q", category: "Australia", dateType: "specific", day: 1, refUrl: "https://www.forexfactory.com/calendar/37-au-ppi-qq" },
    { id: 104, name: "GDP q/q", category: "Australia", dateType: "specific", day: 1, refUrl: "https://www.forexfactory.com/calendar/31-au-gdp-qq" },
    { id: 105, name: "Retail Sales m/m", category: "Australia", dateType: "specific", day: 1, refUrl: "https://www.forexfactory.com/calendar/110-au-retail-sales-mm" },
    { id: 106, name: "Unemployment Rate", category: "Australia", dateType: "specific", day: 1, refUrl: "https://www.forexfactory.com/calendar/54-au-unemployment-rate" },
    { id: 107, name: "Employment Change", category: "Australia", dateType: "specific", day: 1, refUrl: "https://www.forexfactory.com/calendar/73-au-employment-change" }
];

const fs = require('fs');
const path = require('path');

// Helper to load scraped history
const getScrapedHistory = () => {
    try {
        const filePath = path.join(__dirname, 'scraped_history.json');
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
    } catch (e) {
        console.error("Error reading scraped_history.json:", e);
    }
    return {};
};

app.get('/api/scrape', async (req, res) => {
    try {
        const historyData = getScrapedHistory();
        console.log(`[${new Date().toISOString()}] Serving data with ${Object.keys(historyData).length} real indicators integrated.`);

        // Simulating network delay for realism (~1.5s)
        await new Promise(resolve => setTimeout(resolve, 800));

        let finalData = [];
        const startDate = new Date('2024-01-01');
        const endDate = new Date();
        const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + endDate.getMonth() - startDate.getMonth() + 1;

        for (let m = monthsDiff - 1; m >= 0; m--) { // Newest first
            const monthYearDate = new Date(startDate.getFullYear(), startDate.getMonth() + m, 1);
            const monthYearStr = monthYearDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

            // For matching, we need an English month name to compare with FF dates (e.g. "Feb")
            const monthNamesEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const currentMonthEn = monthNamesEn[monthYearDate.getMonth()];
            const currentYearStr = monthYearDate.getFullYear().toString();

            targetIndicators.forEach(indicator => {
                let resultRow = {
                    ...indicator,
                    date: '',
                    monthYear: monthYearStr,
                    movementBefore: '',
                    movementAfter: '',
                    last: '-',
                    forecast: '-',
                    actual: '-',
                    units: indicator.name.includes('CPI') || indicator.name.includes('PPI') ? 'Percentage (%)' : 'Thousand (K)',
                    probability: ''
                };

                // Check if we have real data for this indicator
                const history = historyData[indicator.id];
                let foundReal = false;

                if (history && Array.isArray(history)) {
                    // Find record matching month and year. FF format: "Feb 13, 2026"
                    const match = history.find(entry => {
                        return entry.date.startsWith(currentMonthEn) && entry.date.endsWith(currentYearStr);
                    });

                    if (match) {
                        resultRow.date = match.date;
                        resultRow.actual = match.actual;
                        resultRow.forecast = match.forecast;
                        resultRow.last = match.previous;
                        foundReal = true;
                    }
                }

                // Fallback to specific date logic if real data wasn't found for THIS specific month
                if (!foundReal && indicator.dateType === 'specific') {
                    const specDate = new Date(startDate.getFullYear(), startDate.getMonth() + m, indicator.day);
                    resultRow.date = specDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                }

                finalData.push(resultRow);
            });
        }

        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            totalRows: finalData.length,
            realIndicators: Object.keys(historyData),
            data: finalData
        });

    } catch (error) {
        console.error("Scraping error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch indicators.",
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`[PWA Backend] Server listening on http://localhost:${PORT}`);
});
