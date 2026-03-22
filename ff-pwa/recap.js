document.addEventListener('DOMContentLoaded', () => {
    const recapTbody = document.getElementById('recap-body');
    const recapThead = document.getElementById('recap-thead');
    const refreshBtn = document.getElementById('refresh-btn');
    const lastUpdatedEl = document.getElementById('last-updated');
    const statusDot = document.querySelector('.status-indicator .dot');
    const exportBtn = document.getElementById('export-recap-btn');

    let allFetchedData = []; 
    let uniqueMonths = [];
    let groupedData = {}; // { [indicatorId]: { name, category, data: { [month]: row } } }

    const yellowIds = new Set([17, 18, 19, 20, 21, 30, 31, 33, 34, 35, 36, 38, 39, 40]);

    // Used to order the indicators properly (same as defaultIndicators logic)
    const renderTable = () => {
        // Build table header with months (reverse chronological - newest to oldest from left to right)
        // Or oldest to newest? Let's do newest to oldest left to right, or follow natural reading.
        // Let's do natural reading: oldest on the left, newest on the right
        const sortedMonths = [...uniqueMonths].reverse(); 
        
        let headerHtml = `
            <tr>
                <th rowspan="2" class="col-xs text-center" style="width: 50px;">No</th>
                <th rowspan="2" class="col-lg" style="min-width: 250px;">Indicators</th>
                <th rowspan="2" class="col-md text-center" style="min-width: 150px;">Category</th>
        `;

        // Month headers
        sortedMonths.forEach(month => {
            headerHtml += `<th colspan="2" class="text-center highlight-group">${month}</th>`;
        });
        headerHtml += `</tr><tr>`;

        // Actual / Forecast subheaders
        sortedMonths.forEach(() => {
            headerHtml += `
                <th class="text-center th-sub" style="min-width: 80px;">Actual</th>
                <th class="text-center th-sub" style="min-width: 80px;">Forecast</th>
            `;
        });
        headerHtml += `</tr>`;
        recapThead.innerHTML = headerHtml;

        // Build table rows
        let rowsHtml = '';
        
        // Ensure order 1-52
        const ids = Object.keys(groupedData).map(Number).sort((a,b) => a - b);
        
        ids.forEach(indId => {
            const ind = groupedData[indId];
            const isYellow = yellowIds.has(indId);
            
            rowsHtml += `<tr class="${isYellow ? 'bg-yellow' : ''}">`;
            rowsHtml += `<td class="text-center text-muted">${indId}</td>`;
            rowsHtml += `<td class="indicator-name" title="${ind.name}">
                <div class="indicator-name-container">
                    ${ind.impact ? `<span class="impact-dot impact-${ind.impact}"></span>` : ''}
                    ${ind.name}
                </div>
            </td>`;
            rowsHtml += `<td class="text-center text-muted" style="font-weight: 500;">${ind.category || '-'}</td>`;

            sortedMonths.forEach(month => {
                const dataForMonth = ind.data[month];
                if (dataForMonth) {
                    let actClass = '';
                    if (dataForMonth.actual && dataForMonth.forecast && dataForMonth.actual !== '-' && dataForMonth.forecast !== '-') {
                        const act = parseFloat(dataForMonth.actual.replace(/[^0-9.-]/g, ''));
                        const fore = parseFloat(dataForMonth.forecast.replace(/[^0-9.-]/g, ''));
                        const betterDir = ind.better || 1;
                        if (!isNaN(act) && !isNaN(fore) && act !== fore) {
                            if (betterDir === 1) {
                                actClass = act > fore ? 'val-up' : 'val-down';
                            } else {
                                actClass = act < fore ? 'val-up' : 'val-down';
                            }
                        }
                    }
                    rowsHtml += `<td class="text-center data-cell fw-bold ${actClass}">${dataForMonth.actual || '-'}</td>`;
                    rowsHtml += `<td class="text-center data-cell text-muted">${dataForMonth.forecast || '-'}</td>`;
                } else {
                    rowsHtml += `<td class="text-center text-muted">-</td>`;
                    rowsHtml += `<td class="text-center text-muted">-</td>`;
                }
            });

            rowsHtml += `</tr>`;
        });

        recapTbody.innerHTML = rowsHtml;
    };

    const processData = (rawArray) => {
        // Assume rawArray contains { id, name, category, monthYear, actual, forecast, ... } for passing 12 months * 52 indicators
        uniqueMonths = [...new Set(rawArray.map(d => d.monthYear))];
        groupedData = {};

        rawArray.forEach(row => {
            const id = parseInt(row.id);
            if (!groupedData[id]) {
                groupedData[id] = {
                    name: row.name,
                    category: row.category,
                    impact: row.impact,
                    better: row.better,
                    data: {} // monthYear -> row
                };
            }
            groupedData[id].data[row.monthYear] = row;
        });

        renderTable();
    };

    const fetchRecapData = async () => {
        try {
            refreshBtn.classList.add('rotating');
            statusDot.classList.remove('active');
            statusDot.style.backgroundColor = '#f59e0b';

            const response = await fetch('/api/scrape');
            if (!response.ok) throw new Error("HTTP Error " + response.status);

            const result = await response.json();
            
            if (result.success && result.data) {
                allFetchedData = result.data;
                const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                lastUpdatedEl.textContent = `Pembaruan Terakhir: ${timeStr} ${result.cached ? '(Cache)' : '(Real)'}`;
                
                statusDot.style.backgroundColor = '';
                statusDot.classList.add('active');

                processData(allFetchedData);
            } else {
                throw new Error("Failed to parse recap data");
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            lastUpdatedEl.textContent = "Gagal mengambil data";
            statusDot.style.backgroundColor = '#ef4444';
            recapTbody.innerHTML = `<tr><td colspan="30" class="text-center text-danger" style="padding:2rem;">Koneksi Gagal. Coba lagi.</td></tr>`;
        } finally {
            setTimeout(() => { refreshBtn.classList.remove('rotating'); }, 500);
        }
    };

    // Export to Excel handling
    exportBtn.addEventListener('click', async () => {
        if (allFetchedData.length === 0) {
            alert('Belum ada data untuk diekspor!');
            return;
        }

        const sortedMonths = [...uniqueMonths].reverse();
        const ids = Object.keys(groupedData).map(Number).sort((a,b) => a - b);
        
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Yearly Recap');

        // Styles
        const border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
        const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
        const subHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E4796' } };
        const titleFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A2E' } };
        const yellowFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

        // Define column widths
        const cols = [
            { width: 5 },  // No
            { width: 30 }, // Indicators
            { width: 20 }, // Category
        ];
        sortedMonths.forEach(() => {
            cols.push({ width: 10 }); // Actual
            cols.push({ width: 10 }); // Forecast
        });
        sheet.columns = cols;
        const FULL_COLS = cols.length;

        // Title Row
        const titleRow = sheet.addRow(['FOREX FACTORY - 1 YEAR RECAP']);
        sheet.mergeCells(1, 1, 1, FULL_COLS);
        titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
        titleRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
        titleRow.getCell(1).fill = titleFill;
        titleRow.height = 25;
        
        sheet.addRow([]);

        // Main Headers (Row 3)
        const h1 = sheet.addRow(['No', 'Indicators', 'Category']);
        const h2 = sheet.addRow(['', '', '']); // Sub-headers (Row 4)
        
        h1.height = 20;
        h2.height = 18;

        // Merge first 3 columns
        sheet.mergeCells(3, 1, 4, 1);
        sheet.mergeCells(3, 2, 4, 2);
        sheet.mergeCells(3, 3, 4, 3);
        
        // Format first 3 headers
        for(let i=1; i<=3; i++) {
            const cell = h1.getCell(i);
            cell.font = headerFont;
            cell.fill = headerFill;
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = border;
            h2.getCell(i).border = border;
        }

        // Add Month Headers
        let colIdx = 4;
        sortedMonths.forEach(month => {
            const cell = h1.getCell(colIdx);
            cell.value = month;
            cell.font = headerFont;
            cell.fill = headerFill;
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = border;
            
            // Merge month title over Actual & Forecast
            sheet.mergeCells(3, colIdx, 3, colIdx + 1);
            h1.getCell(colIdx+1).border = border;

            // Sub headers
            const subAct = h2.getCell(colIdx);
            subAct.value = 'Actual';
            subAct.font = headerFont;
            subAct.fill = subHeaderFill;
            subAct.alignment = { horizontal: 'center', vertical: 'middle' };
            subAct.border = border;

            const subFore = h2.getCell(colIdx + 1);
            subFore.value = 'Forecast';
            subFore.font = headerFont;
            subFore.fill = subHeaderFill;
            subFore.alignment = { horizontal: 'center', vertical: 'middle' };
            subFore.border = border;

            colIdx += 2;
        });

        // Add Data Rows
        ids.forEach(indId => {
            const ind = groupedData[indId];
            const isYellow = yellowIds.has(indId);
            const rowFill = isYellow ? yellowFill : null;
            
            const rowData = [indId, ind.name, ind.category];
            sortedMonths.forEach(month => {
                const dataForMonth = ind.data[month] || {};
                rowData.push(dataForMonth.actual || '-');
                rowData.push(dataForMonth.forecast || '-');
            });
            
            const dataRow = sheet.addRow(rowData);
            dataRow.height = 16;
            
            for(let c=1; c<=FULL_COLS; c++) {
                const cell = dataRow.getCell(c);
                cell.font = { size: 9, color: { argb: 'FF000000' } };
                cell.border = border;
                
                if (c <= 2) cell.alignment = { horizontal: 'left', vertical: 'middle' };
                else cell.alignment = { horizontal: 'center', vertical: 'middle' };
                
                if (rowFill) cell.fill = rowFill;

                // Colorize actual based on actual > forecast? Can do optionally.
                // Keeping black for standard print view
            }
        });

        // Download
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ForexFactory_Yearly_Recap.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
    });

    refreshBtn.addEventListener('click', fetchRecapData);

    // Initial load
    fetchRecapData();
});
