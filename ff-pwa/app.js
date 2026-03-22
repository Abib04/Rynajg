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
                    <td class="text-center">-</td>
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
        const auTableBody = document.getElementById('au-table-body');
        let usRowsHtml = '';
        let auRowsHtml = '';
        
        // Use a Set to track seen indicators in the current render cycle to maintain 1-52 indexing
        const seenUsIds = new Set();
        const seenAuIds = new Set();
        
        dataArray.forEach((row, index) => {
            const isAu = parseInt(row.id) > 100 || row.category === 'Australia';
            
            // To ensure 1-52 index loops safely if multiple months are shown (though filtering handles that)
            // Just use a simple increment
            const visualIndex = isAu ? (seenAuIds.add(row.id), seenAuIds.size) : (seenUsIds.add(row.id), seenUsIds.size);

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
            let refUrl = row.refUrl;
            if (!refUrl) { 
                const prefix = isAu ? "au" : "us";
                refUrl = `https://www.forexfactory.com/calendar/${row.id}-${prefix}-${row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            }

            const rowStr = `
                <tr>
                    <td class="text-center text-muted">${visualIndex}</td>
                    <td class="indicator-name" title="${row.name}">${row.name}</td>
                    <td class="text-center text-muted" style="font-weight: 500;">${row.category === 'Australia' ? '-' : (row.category || '-')}</td>
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

            if (isAu) auRowsHtml += rowStr;
            else usRowsHtml += rowStr;
        });
        
        tableBody.innerHTML = usRowsHtml;
        if (auTableBody) auTableBody.innerHTML = auRowsHtml;
    };

    const fetchData = async () => {
        try {
            // UI Loading state
            refreshBtn.classList.add('rotating');
            statusDot.classList.remove('active');
            statusDot.style.backgroundColor = '#f59e0b'; // Yellow while fetching

            const response = await fetch('/api/scrape');
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

    // Export to Excel (styled, matching the reference format)
    document.getElementById('export-btn').addEventListener('click', async () => {
        if (allFetchedData.length === 0) {
            alert('Belum ada data untuk diekspor. Coba perbarui data dulu.');
            return;
        }

        // Filter data as currently displayed
        let exportData = allFetchedData.filter(d => d.monthYear === dateFilter.value);
        const dayVal = dayFilter.value;
        if (dayVal && dayVal !== 'ALL') {
            exportData = exportData.filter(d => d.date === dayVal);
        }

        // Yellow row IDs (matching app.js highlight logic)
        const yellowIds = new Set([17, 18, 19, 20, 21, 30, 31, 33, 34, 35, 36, 38, 39, 40]);

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Indicators');

        // Column widths (cols A-L = 12 cols)
        sheet.columns = [
            { width: 5 },   // No
            { width: 28 },  // Indicators
            { width: 24 },  // Category
            { width: 13 },  // Date
            { width: 20 },  // Movement Before Date
            { width: 20 },  // Movement After Date
            { width: 10 },  // Last
            { width: 10 },  // Forecast
            { width: 10 },  // Actual
            { width: 16 },  // Units
            { width: 22 },  // Percentage Probability
            { width: 55 },  // Reference
        ];

        const COLS = 12;

        // Helper: apply border to a cell
        const border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        const thinBorder = (cell) => { cell.border = border; };

        const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } }; // Dark blue
        const subHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E4796' } };
        const yellowFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
        const titleFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A2E' } };

        // --- ROW 1: Title ---
        const titleRow = sheet.addRow(['FOREX FACTORY DATA PROBABILITY']);
        sheet.mergeCells(1, 1, 1, COLS);
        titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
        titleRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
        titleRow.getCell(1).fill = titleFill;
        titleRow.height = 22;

        // --- ROW 2: UNITED STATES ---
        const subtitleRow = sheet.addRow(['UNITED STATES']);
        sheet.mergeCells(2, 1, 2, COLS);
        subtitleRow.getCell(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        subtitleRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
        subtitleRow.getCell(1).fill = titleFill;
        subtitleRow.height = 18;

        // --- ROW 3: empty spacer ---
        sheet.addRow([]);

        // --- ROW 4: Main Headers (2-row merged header) ---
        // We write both header rows at once using manual cell setting
        const h1 = sheet.addRow([]); // row 4
        const h2 = sheet.addRow([]); // row 5
        h1.height = 22;
        h2.height = 18;

        const mainHeaders = [
            { col: 1, label: 'No', mergeRows: true },
            { col: 2, label: 'Indicators', mergeRows: true },
            { col: 3, label: 'Category', mergeRows: true },
            { col: 4, label: 'Date', mergeRows: true },
            { col: 5, label: 'Movement Before Date', mergeRows: true },
            { col: 6, label: 'Movement after Date', mergeRows: true },
            { col: 7, label: 'Movement Percentage', mergeRows: false, span: 3 },
            { col: 10, label: 'Units', mergeRows: true },
            { col: 11, label: 'Percentage Probability', mergeRows: true },
            { col: 12, label: 'Reference', mergeRows: true },
        ];

        const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9.5 };

        for (const h of mainHeaders) {
            const cell = h1.getCell(h.col);
            cell.value = h.label;
            cell.font = headerFont;
            cell.fill = headerFill;
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            thinBorder(cell);

            if (h.mergeRows) {
                // merge rows 4-5 for this col
                sheet.mergeCells(4, h.col, 5, h.col);
            } else if (h.span) {
                // merge cols for "Movement Percentage" header
                sheet.mergeCells(4, h.col, 4, h.col + h.span - 1);
            }
        }

        // Row 5 sub-headers for Movement Percentage
        const subLabels = ['Last', 'Forecast', 'Actual'];
        subLabels.forEach((label, i) => {
            const cell = h2.getCell(7 + i);
            cell.value = label;
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
            cell.fill = subHeaderFill;
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            thinBorder(cell);
        });
        // Apply fill to already-merged single-col headers in row 5
        [1, 2, 3, 4, 5, 6, 10, 11, 12].forEach(c => {
            const cell = h2.getCell(c);
            cell.fill = headerFill;
            thinBorder(cell);
        });

        // --- DATA ROWS (starting at row 6) ---
        // Group consecutive rows with same category for vertical merging
        let currentRowNum = 6;
        let categoryStartRow = 6;
        let currentCategory = null;

        exportData.forEach((row, idx) => {
            const isYellow = yellowIds.has(Number(row.id));
            const rowFill = isYellow ? yellowFill : null;
            const textColor = 'FF000000'; // black text for all rows

            const dataRow = sheet.addRow([
                (idx % 52) + 1,    // No
                row.name || '',
                row.category || '',
                row.date || '',
                row.movementBefore || '-',
                row.movementAfter || '-',
                row.last || '-',
                row.forecast || '-',
                row.actual || '-',
                row.units || '',
                row.probability || '-',
                row.refUrl || ''
            ]);
            dataRow.height = 16;

            for (let c = 1; c <= COLS; c++) {
                const cell = dataRow.getCell(c);
                cell.font = { size: 9, color: { argb: textColor } };
                cell.alignment = { horizontal: c <= 2 || c === 12 ? 'left' : 'center', vertical: 'middle' };
                thinBorder(cell);
                if (rowFill) cell.fill = rowFill;
            }

            // Track category for merging
            if (row.category !== currentCategory) {
                if (currentCategory !== null && currentRowNum - 1 > categoryStartRow) {
                    sheet.mergeCells(categoryStartRow, 3, currentRowNum - 1, 3);
                }
                currentCategory = row.category;
                categoryStartRow = currentRowNum;
            }
            currentRowNum++;
        });

        // Merge last category group
        if (currentCategory !== null && currentRowNum - 1 > categoryStartRow) {
            sheet.mergeCells(categoryStartRow, 3, currentRowNum - 1, 3);
        }

        // Make category cells centered & middle-aligned
        for (let r = 6; r < currentRowNum; r++) {
            const cell = sheet.getCell(r, 3);
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        }

        // --- DOWNLOAD ---
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ForexFactory_${(dateFilter.value || 'data').replace(/\s/g, '_')}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
    });

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
