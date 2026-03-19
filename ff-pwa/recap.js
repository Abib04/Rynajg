document.addEventListener('DOMContentLoaded', async () => {
    const recapHead = document.getElementById('recap-head');
    const recapBody = document.getElementById('recap-body');

    // Identical list to app.js for consistent ordering
    const targetIndicators = [
        { id: 1, name: "CPI (Consumer Price Index)" },
        { id: 2, name: "Core CPI" },
        { id: 3, name: "PPI (Producer Price Index)" },
        { id: 4, name: "Core PPI (Producer Price Index)" },
        { id: 5, name: "Import/Export Prices" },
        { id: 6, name: "PCE/Core PCE" },
        { id: 7, name: "Non-farm Payrolls" },
        { id: 8, name: "Non-Farm Employment Change" },
        { id: 9, name: "Unemployment Rate" },
        { id: 10, name: "Employment Change" },
        { id: 11, name: "Average Hourly Earnings" },
        { id: 12, name: "Unemployment Claims (W1)" },
        { id: 13, name: "Unemployment Claims (W2)" },
        { id: 14, name: "Unemployment Claims (W3)" },
        { id: 15, name: "Unemployment Claims (W4)" },
        { id: 16, name: "ADP Non-Farm Employment Change" },
        { id: 17, name: "GDP (q/q)" },
        { id: 18, name: "Final GDP" },
        { id: 19, name: "Flash GDP" },
        { id: 20, name: "Industrial Production" },
        { id: 21, name: "Capacity Utilization" },
        { id: 22, name: "Retail Sales" },
        { id: 23, name: "Core Retail Sales" },
        { id: 24, name: "Personal Spending" },
        { id: 25, name: "Personal Income" },
        { id: 26, name: "US ISM Manufacturing PMI" },
        { id: 27, name: "US ISM Services PMI" },
        { id: 28, name: "Composite PMI" },
        { id: 29, name: "US CB Consumer Confidence" },
        { id: 30, name: "Business Confidence" },
        { id: 31, name: "ZEW Economic Sentiment" },
        { id: 32, name: "Interest Rate Decision" },
        { id: 33, name: "Monetary Policy Statement" },
        { id: 34, name: "FOMC Minutes" },
        { id: 35, "name": "Central Bank Press Conference" },
        { id: 36, "name": "Governor Speech" },
        { id: 37, "name": "Trade Balance" },
        { id: 38, "name": "Current Account" },
        { id: 39, "name": "Foreign Investment" },
        { id: 40, "name": "Capital Flows" },
        { id: 41, "name": "Bond Auctions (10Y)" },
        { id: 42, "name": "Crude Oil Inventories (W1)" },
        { id: 43, "name": "Crude Oil Inventories (W2)" },
        { id: 44, "name": "Crude Oil Inventories (W3)" },
        { id: 45, "name": "Crude Oil Inventories (W4)" },
        { id: 47, "name": "Natural Gas Storage (W1)" },
        { id: 48, "name": "Natural Gas Storage (W2)" },
        { id: 49, "name": "Natural Gas Storage (W3)" },
        { id: 50, "name": "Natural Gas Storage (W4)" },
        { id: 51, "name": "Housing Starts" },
        { id: 52, "name": "Building Permits" }
    ];

    const fetchAllData = async () => {
        try {
            const response = await fetch('/api/scrape');
            const result = await response.json();
            if (result.success && result.data) {
                renderRecap(result.data);
            } else {
                recapBody.innerHTML = '<tr><td colspan="13" class="text-center text-danger">Gagal memuat data.</td></tr>';
            }
        } catch (error) {
            console.error("Error fetching recap data:", error);
            recapBody.innerHTML = '<tr><td colspan="13" class="text-center text-danger">Koneksi gagal.</td></tr>';
        }
    };

    const renderRecap = (allData) => {
        // 1. Get last 12 months in descending order (newest first)
        const monthsInOrder = [...new Set(allData.map(d => d.monthYear))].filter(Boolean).slice(0, 12);

        // 2. Build Header
        let headerHtml = `<tr><th class="sticky-col" style="min-width: 250px;">Indicators</th>`;
        monthsInOrder.forEach(month => {
            // Shorten month names for table header (e.g. "Maret 2026" -> "Mar '26")
            const parts = month.split(' ');
            const monthShort = parts[0].substring(0, 3);
            const yearShort = parts[1].substring(2);
            headerHtml += `<th class="text-center">${monthShort} '${yearShort}</th>`;
        });
        headerHtml += `</tr>`;
        recapHead.innerHTML = headerHtml;

        // 3. Build Body per Indicator
        let bodyHtml = '';
        targetIndicators.forEach((ind, i) => {
            bodyHtml += `<tr class="${i % 2 === 0 ? 'bg-even' : 'bg-odd'}">`;
            bodyHtml += `<td class="sticky-col" style="font-weight: 600; color: #cbd5e1;">${ind.name}</td>`;

            monthsInOrder.forEach(month => {
                const entry = allData.find(d => d.id === ind.id && d.monthYear === month);
                if (entry && (entry.actual !== '-' || entry.forecast !== '-')) {
                    
                    let colorClass = '';
                    if (entry.actual !== '-' && entry.forecast !== '-') {
                        const act = parseFloat(entry.actual);
                        const fore = parseFloat(entry.forecast);
                        if (!isNaN(act) && !isNaN(fore)) {
                            colorClass = act > fore ? 'val-up' : (act < fore ? 'val-down' : '');
                        }
                    }

                    bodyHtml += `
                        <td class="text-center">
                            <div class="val-pair">
                                <span class="val-act ${colorClass}">${entry.actual || '-'}</span>
                                <span class="val-fore">${entry.forecast === '-' ? '' : 'F: ' + entry.forecast}</span>
                            </div>
                        </td>`;
                } else {
                    bodyHtml += `<td class="text-center text-muted">-</td>`;
                }
            });
            bodyHtml += `</tr>`;
        });
        recapBody.innerHTML = bodyHtml;
    }

    fetchAllData();
});
