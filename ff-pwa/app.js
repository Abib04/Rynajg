document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('table-body');
    const refreshBtn = document.getElementById('refresh-btn');
    const lastUpdatedEl = document.getElementById('last-updated');
    const statusDot = document.querySelector('.status-indicator .dot');
    const dateFilter = document.getElementById('date-filter');
    const dayFilter = document.getElementById('day-filter');

    let allFetchedData = []; // Store all data globally for filtering

    // Default indicators if API fails initially, ensuring structure remains intact
    const defaultIndicators = [
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
        { id: 35, name: "Central Bank Press Conference" },
        { id: 36, name: "Governor Speech" },
        { id: 37, name: "Trade Balance" },
        { id: 38, name: "Current Account" },
        { id: 39, name: "Foreign Investment" },
        { id: 40, name: "Capital Flows" },
        { id: 41, name: "Bond Auctions (10Y)" },
        { id: 42, name: "Crude Oil Inventories (W1)" },
        { id: 43, name: "Crude Oil Inventories (W2)" },
        { id: 44, name: "Crude Oil Inventories (W3)" },
        { id: 45, name: "Crude Oil Inventories (W4)" },
        { id: 46, name: "Crude Oil Inventories (W5)" },
        { id: 47, name: "Natural Gas Storage (W1)" },
        { id: 48, name: "Natural Gas Storage (W2)" },
        { id: 49, name: "Natural Gas Storage (W3)" },
        { id: 50, name: "Natural Gas Storage (W4)" },
        { id: 51, name: "Housing Starts" },
        { id: 52, name: "Building Permits" }
    ];

    const generateEmptyTable = () => {
        let rowsHtml = '';
        defaultIndicators.forEach((ind, index) => {
            // Apply yellow highlight to specific row ranges based on User's Excel image
            const isYellow = (ind.id >= 17 && ind.id <= 21) ||
                (ind.id >= 30 && ind.id <= 31) ||
                (ind.id >= 33 && ind.id <= 36) ||
                (ind.id >= 38 && ind.id <= 40);

            rowsHtml += `
                <tr class="${isYellow ? 'bg-yellow' : ''}">
                    <td class="text-center text-muted">${index + 1}</td>
                    <td class="indicator-name" title="${ind.name}">${ind.name}</td>
                    <td class="text-center text-muted">-</td>
                    <td class="text-center">-</td>
                    <td class="text-center">-</td>
                    <td class="text-center">-</td>
                    <td class="text-center data-cell">-</td>
                    <td class="text-center data-cell">-</td>
                    <td class="text-center data-cell">-</td>
                    <td class="text-center text-secondary" style="font-size: 0.75rem;">Percentage (%)</td>
                    <td class="text-center">-</td>
                    <td>-</td>
                </tr>
            `;
        });
        tableBody.innerHTML = rowsHtml;
    };

    const renderData = (dataArray) => {
        let rowsHtml = '';
        dataArray.forEach((row, index) => {
            // Reset index visual counting to loop 1-52 if we display multiple instances
            const visualIndex = (index % 52) + 1;

            // Determine styling for actual vs forecast (assuming green if actual > forecast)
            let valClass = '';
            if (row.actual && row.forecast) {
                const act = parseFloat(row.actual);
                const fore = parseFloat(row.forecast);
                if (!isNaN(act) && !isNaN(fore)) {
                    valClass = act > fore ? 'val-up' : (act < fore ? 'val-down' : '');
                }
            }

            // Use provided specific Reference URL or fallback
            const refUrl = row.refUrl || `https://www.forexfactory.com/calendar/${row.id}-us-${row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

            rowsHtml += `
                <tr>
                    <td class="text-center text-muted">${visualIndex}</td>
                    <td class="indicator-name" title="${row.name}">${row.name}</td>
                    <td class="text-center text-muted" style="font-weight: 500;">${row.category || '-'}</td>
                    <td class="text-center">${row.date || ''}</td>
                    <td class="text-center">${row.movementBefore || '-'}</td>
                    <td class="text-center">${row.movementAfter || '-'}</td>
                    <td class="text-center data-cell">${row.last || '-'}</td>
                    <td class="text-center data-cell">${row.forecast || '-'}</td>
                    <td class="text-center data-cell ${valClass}">${row.actual || '-'}</td>
                    <td class="text-center text-secondary" style="font-size: 0.75rem;">${row.units || 'Percentage (%)'}</td>
                    <td class="text-center">${row.probability || '-'}</td>
                    <td>
                        <a href="${refUrl}" class="ref-link" target="_blank" title="${refUrl}">
                            ${refUrl.replace('https://www.forexfactory.com/calendar/', '')}
                        </a>
                    </td>
                </tr>
            `;
        });
        tableBody.innerHTML = rowsHtml;
    };

    const fetchData = async () => {
        try {
            // UI Loading state
            refreshBtn.classList.add('rotating');
            statusDot.classList.remove('active');
            statusDot.style.backgroundColor = '#f59e0b'; // Yellow while fetching

            const response = await fetch('http://localhost:3000/api/scrape');
            if (!response.ok) throw new Error("HTTP Error " + response.status);

            const result = await response.json();

            if (result.success && result.data) {
                allFetchedData = result.data; // Save for filtering

                // Extract unique months and populate dropdown
                const uniqueMonths = [...new Set(result.data.map(d => d.monthYear))].filter(Boolean);

                // If it's the first time loading the dropdown
                const currentMonthSelection = dateFilter.value;
                dateFilter.innerHTML = '';
                uniqueMonths.forEach(month => {
                    const option = document.createElement('option');
                    option.value = month;
                    option.textContent = month;
                    dateFilter.appendChild(option);
                });

                // Restore previous selection or select the newest (first in list)
                if (currentMonthSelection && uniqueMonths.includes(currentMonthSelection)) {
                    dateFilter.value = currentMonthSelection;
                } else if (uniqueMonths.length > 0) {
                    dateFilter.value = uniqueMonths[0];
                }

                // Initial Filter (by month)
                updateDayFilterAndRender();

                // Update timestamps
                const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                lastUpdatedEl.textContent = `Pembaruan Terakhir: ${timeStr} ${result.cached ? '(Cache)' : '(Real)'}`;

                // Success styles
                statusDot.style.backgroundColor = '';
                statusDot.classList.add('active');
            } else {
                throw new Error(result.message || "Failed to parse data");
            }
        } catch (error) {
            console.error("Fetch Data Error:", error);
            lastUpdatedEl.textContent = "Koneksi ke Server Gagal";
            statusDot.style.backgroundColor = '#ef4444'; // Red error
            // Fallback to empty table
            if (tableBody.innerHTML.includes('loader')) generateEmptyTable();
        } finally {
            setTimeout(() => {
                refreshBtn.classList.remove('rotating');
            }, 500); // Small delay for visual effect
        }
    };

    // Events
    refreshBtn.addEventListener('click', fetchData);

    dateFilter.addEventListener('change', () => {
        if (allFetchedData.length > 0) {
            updateDayFilterAndRender();
        }
    });

    dayFilter.addEventListener('change', () => {
        if (allFetchedData.length > 0) {
            let filteredData = allFetchedData.filter(d => d.monthYear === dateFilter.value);
            if (dayFilter.value !== 'ALL') {
                filteredData = filteredData.filter(d => d.date === dayFilter.value);
            }
            renderData(filteredData);
        }
    });

    function updateDayFilterAndRender() {
        const monthData = allFetchedData.filter(d => d.monthYear === dateFilter.value);

        // Populate day filter
        const uniqueDays = [...new Set(monthData.map(d => d.date))].filter(Boolean);
        uniqueDays.sort((a, b) => {
            const dA = parseInt(a.split(' ')[0]);
            const dB = parseInt(b.split(' ')[0]);
            return dA - dB;
        });

        dayFilter.innerHTML = '<option value="ALL">Semua Tanggal</option>';
        uniqueDays.forEach(day => {
            const option = document.createElement('option');
            option.value = day;
            option.textContent = day;
            dayFilter.appendChild(option);
        });

        dayFilter.style.display = uniqueDays.length > 0 ? 'inline-block' : 'none';

        // Render data for all days in the month by default when month changes
        renderData(monthData);
    }

    // Initial load
    generateEmptyTable();
    fetchData();

    // Auto Polling Setup (every 60 seconds)
    // 60000 ms = 1 minute. Adjust as needed.
    setInterval(fetchData, 60000);

    // --- PWA Service Worker Registration ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js').then(registration => {
                console.log('SW Registered: ', registration.scope);
            }).catch(err => {
                console.log('SW Registration failed: ', err);
            });
        });
    }
});
