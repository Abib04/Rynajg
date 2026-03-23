document.addEventListener('DOMContentLoaded', () => {
    const refreshBtn = document.getElementById('refresh-btn');
    const lastUpdatedEl = document.getElementById('last-updated');
    const statusDot = document.querySelector('.status-indicator .dot');
    const exportBtn = document.getElementById('export-recap-btn');
    const yearFilter = document.getElementById('year-filter');
    const sectionFilter = document.getElementById('section-filter');
    const recapContainer = document.getElementById('recap-container');

    let allFetchedData = [];
    let groupedData = {}; // { [indicatorId]: { name, category, impact, better, data: { "monthYear": row } } }

    const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

    // Section definitions (ordered, with border colors)
    const SECTIONS = [
        { key: 'US',  label: 'United States',    color: '#3b82f6', categories: ['Inflation & Prices','Labour','Economy Growth','Consumption & Domestic Demand','Sentiment & Survey','Monetary Policy','Balance sheet & External Sector','Others'] },
        { key: 'AU',  label: 'Australia (AU)',    color: '#16a34a', categories: ['Australia'] },
        { key: 'EZ',  label: 'Euro Area (EZ)',    color: '#f59e0b', categories: ['Euro Area'] },
        { key: 'UK',  label: 'United Kingdom (UK)', color: '#7c3aed', categories: ['United Kingdom'] },
        { key: 'JP',  label: 'Japan (JY)',         color: '#db2777', categories: ['Japan'] },
        { key: 'NZ',  label: 'New Zealand (NZ)',   color: '#0891b2', categories: ['New Zealand'] },
        { key: 'SZ',  label: 'Swiss (SZ / CHF)',   color: '#dc2626', categories: ['Swiss'] },
        { key: 'CA',  label: 'Canada (CA)',         color: '#d97706', categories: ['Canada'] },
    ];

    const getMonthIndex = (monthYearStr) => {
        // "Januari 2024" -> returns month index 0-11
        for (let i = 0; i < MONTHS_ID.length; i++) {
            if (monthYearStr.startsWith(MONTHS_ID[i])) return i;
        }
        return -1;
    };

    const getYearFromMonthYear = (monthYearStr) => {
        const parts = monthYearStr.split(' ');
        return parseInt(parts[parts.length - 1]);
    };

    const renderAllSections = (selectedYear) => {
        recapContainer.innerHTML = '';
        const activeSection = sectionFilter.value;

        SECTIONS.forEach(section => {
            if (activeSection !== 'ALL' && activeSection !== section.key) return;

            // Filter indicators for this section
            const sectionIds = Object.keys(groupedData)
                .map(Number)
                .filter(id => {
                    const ind = groupedData[id];
                    return section.categories.includes(ind.category);
                })
                .sort((a, b) => a - b);

            if (sectionIds.length === 0) return;

            // Section header
            const h2 = document.createElement('h2');
            h2.style.cssText = `color:#f8fafc;font-size:1.1rem;margin-bottom:0.75rem;margin-top:1.5rem;padding-left:0.5rem;border-left:4px solid ${section.color};`;
            h2.textContent = section.label;
            recapContainer.appendChild(h2);

            // Year row header (Per. YYYY - Jan through Dec)
            let headerHtml = `
                <table style="width:100%;border-collapse:collapse;min-width:1400px;font-size:0.78rem;">
                <thead>
                    <tr>
                        <th rowspan="2" style="width:32px;text-align:center;padding:4px 2px;border:1px solid #1e293b;background:#1f3864;color:#fff;">No</th>
                        <th rowspan="2" style="min-width:180px;padding:4px 6px;border:1px solid #1e293b;background:#1f3864;color:#fff;">Indicators</th>
                        <th rowspan="2" style="min-width:60px;text-align:center;padding:4px 2px;border:1px solid #1e293b;background:#1f3864;color:#fff;">UOM</th>`;

            // Per. YYYY spanning all 12 months
            headerHtml += `<th colspan="24" style="text-align:center;padding:4px;border:1px solid #1e293b;background:#1f3864;color:#fff;font-weight:700;">Per. ${selectedYear}</th>`;
            headerHtml += `</tr><tr>`;

            // Month sub-headers (Forecast + Actual for each month)
            MONTHS_EN.forEach(mon => {
                headerHtml += `
                    <th colspan="2" style="text-align:center;padding:3px 2px;border:1px solid #1e293b;background:#2e4796;color:#fff;">${mon}</th>`;
            });
            headerHtml += `</tr><tr style="background:#2e4796;">
                <th colspan="3" style="border:1px solid #1e293b;"></th>`;
            MONTHS_EN.forEach(() => {
                headerHtml += `
                    <th style="text-align:center;padding:2px;border:1px solid #1e293b;color:#cbd5e1;font-size:0.7rem;font-weight:600;">For.</th>
                    <th style="text-align:center;padding:2px;border:1px solid #1e293b;color:#cbd5e1;font-size:0.7rem;font-weight:600;">Act.</th>`;
            });
            headerHtml += `</tr></thead><tbody>`;

            // Data rows
            let rowNum = 0;
            sectionIds.forEach(indId => {
                const ind = groupedData[indId];
                rowNum++;
                const impactDot = ind.impact ? `<span class="impact-dot impact-${ind.impact}"></span>` : '';
                const uom = ind.units || '-';

                headerHtml += `<tr>
                    <td style="text-align:center;padding:3px 2px;border:1px solid #1e293b;color:#94a3b8;">${rowNum}</td>
                    <td style="padding:3px 6px;border:1px solid #1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px;">
                        <div style="display:flex;align-items:center;gap:4px;">${impactDot}${ind.name}</div>
                    </td>
                    <td style="text-align:center;padding:3px 2px;border:1px solid #1e293b;color:#94a3b8;font-size:0.7rem;">-</td>`;

                MONTHS_EN.forEach((mon, mIdx) => {
                    const monthKey = `${MONTHS_ID[mIdx]} ${selectedYear}`;
                    const d = ind.data[monthKey];
                    
                    let foreVal = '-', actVal = '-', actStyle = '';
                    if (d) {
                        foreVal = d.forecast || '-';
                        actVal  = d.actual   || '-';

                        // Color coding
                        if (actVal !== '-' && foreVal !== '-') {
                            const act  = parseFloat(actVal.replace(/[^0-9.-]/g, ''));
                            const fore = parseFloat(foreVal.replace(/[^0-9.-]/g, ''));
                            const better = ind.better || 1;
                            if (!isNaN(act) && !isNaN(fore) && act !== fore) {
                                const isGood = better === 1 ? act > fore : act < fore;
                                actStyle = isGood ? 'color:#22c55e;font-weight:700;' : 'color:#ef4444;font-weight:700;';
                            }
                        }
                    }

                    headerHtml += `
                        <td style="text-align:center;padding:2px 3px;border:1px solid #1e293b;color:#94a3b8;">${foreVal}</td>
                        <td style="text-align:center;padding:2px 3px;border:1px solid #1e293b;${actStyle}">${actVal}</td>`;
                });

                headerHtml += `</tr>`;
            });

            headerHtml += `</tbody></table>`;

            const wrapper = document.createElement('div');
            wrapper.className = 'table-card';
            wrapper.style.cssText = 'margin-bottom:1.5rem;overflow-x:auto;';
            wrapper.innerHTML = headerHtml;
            recapContainer.appendChild(wrapper);
        });
    };

    const processData = (rawArray) => {
        groupedData = {};
        rawArray.forEach(row => {
            const id = parseInt(row.id);
            if (!groupedData[id]) {
                groupedData[id] = {
                    name: row.name,
                    category: row.category || '',
                    impact: row.impact,
                    better: row.better,
                    units: row.units,
                    data: {}
                };
            }
            groupedData[id].data[row.monthYear] = row;
        });

        // Extract unique years
        const yearsSet = new Set();
        rawArray.forEach(row => {
            if (row.monthYear) {
                const yr = getYearFromMonthYear(row.monthYear);
                if (!isNaN(yr)) yearsSet.add(yr);
            }
        });
        const years = [...yearsSet].sort((a, b) => b - a); // newest first

        // Populate year dropdown
        const prevYear = yearFilter.value;
        yearFilter.innerHTML = '';
        years.forEach(yr => {
            const opt = document.createElement('option');
            opt.value = yr;
            opt.textContent = yr;
            yearFilter.appendChild(opt);
        });

        // Restore or pick current year
        const currentYear = new Date().getFullYear();
        if (prevYear && years.includes(parseInt(prevYear))) {
            yearFilter.value = prevYear;
        } else if (years.includes(currentYear)) {
            yearFilter.value = currentYear;
        } else {
            yearFilter.value = years[0];
        }

        renderAllSections(parseInt(yearFilter.value));
    };

    const fetchRecapData = async () => {
        try {
            refreshBtn.classList.add('rotating');
            statusDot.classList.remove('active');
            statusDot.style.backgroundColor = '#f59e0b';

            const response = await fetch('/api/scrape');
            if (!response.ok) throw new Error('HTTP Error ' + response.status);
            const result = await response.json();

            if (result.success && result.data) {
                allFetchedData = result.data;
                const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                lastUpdatedEl.textContent = `Pembaruan Terakhir: ${timeStr}`;
                statusDot.style.backgroundColor = '';
                statusDot.classList.add('active');
                processData(allFetchedData);
            } else {
                throw new Error('Failed to parse data');
            }
        } catch (err) {
            console.error(err);
            lastUpdatedEl.textContent = 'Gagal mengambil data';
            statusDot.style.backgroundColor = '#ef4444';
            recapContainer.innerHTML = `<p style="color:#ef4444;padding:2rem;">Koneksi Gagal. Coba perbarui data.</p>`;
        } finally {
            setTimeout(() => refreshBtn.classList.remove('rotating'), 500);
        }
    };

    // Events
    yearFilter.addEventListener('change', () => {
        renderAllSections(parseInt(yearFilter.value));
    });

    sectionFilter.addEventListener('change', () => {
        renderAllSections(parseInt(yearFilter.value));
    });

    refreshBtn.addEventListener('click', fetchRecapData);

    // Export to Excel
    exportBtn.addEventListener('click', async () => {
        if (allFetchedData.length === 0) { alert('Belum ada data!'); return; }
        const selectedYear = parseInt(yearFilter.value);
        const activeSection = sectionFilter.value;

        const workbook = new ExcelJS.Workbook();

        const border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
        const hFont = { bold:true, color:{argb:'FFFFFFFF'}, size:9 };
        const hFill = { type:'pattern', pattern:'solid', fgColor:{argb:'FF1F3864'} };
        const shFill = { type:'pattern', pattern:'solid', fgColor:{argb:'FF2E4796'} };
        const titleFill = { type:'pattern', pattern:'solid', fgColor:{argb:'FF1A1A2E'} };

        SECTIONS.forEach(section => {
            if (activeSection !== 'ALL' && activeSection !== section.key) return;

            const sectionIds = Object.keys(groupedData).map(Number)
                .filter(id => section.categories.includes(groupedData[id].category))
                .sort((a,b) => a - b);
            if (sectionIds.length === 0) return;

            const sheet = workbook.addWorksheet(section.key);

            // Columns: No, Indicators, UOM, then 12*2 (Forecast+Actual)
            const cols = [{width:5},{width:30},{width:12}];
            MONTHS_EN.forEach(() => { cols.push({width:9}); cols.push({width:9}); });
            sheet.columns = cols;
            const TOTAL_COLS = cols.length;

            // Title
            const titleRow = sheet.addRow([`FOREX FACTORY - ${section.label} - ${selectedYear}`]);
            sheet.mergeCells(1,1,1,TOTAL_COLS);
            titleRow.getCell(1).font = { bold:true, size:13, color:{argb:'FFFFFFFF'} };
            titleRow.getCell(1).fill = titleFill;
            titleRow.getCell(1).alignment = { horizontal:'left', vertical:'middle' };
            titleRow.height = 24;

            sheet.addRow([]); // spacer

            // Header row 1: Per. YEAR spanning 24 cols
            const h1 = sheet.addRow([]);
            h1.height = 20;
            ['No','Indicators','UOM'].forEach((label, i) => {
                const cell = h1.getCell(i+1);
                cell.value = label; cell.font = hFont; cell.fill = hFill;
                cell.alignment = {horizontal:'center',vertical:'middle'};
                cell.border = border;
                sheet.mergeCells(3,i+1,4,i+1);
            });
            const perCell = h1.getCell(4);
            perCell.value = `Per. ${selectedYear}`;
            perCell.font = hFont; perCell.fill = hFill;
            perCell.alignment = {horizontal:'center',vertical:'middle'};
            perCell.border = border;
            sheet.mergeCells(3,4,3,TOTAL_COLS);

            // Header row 2: Month names
            const h2 = sheet.addRow([]);
            h2.height = 16;
            [1,2,3].forEach(c => { h2.getCell(c).fill = hFill; h2.getCell(c).border = border; });
            MONTHS_EN.forEach((mon, i) => {
                const col = 4 + i*2;
                const cell = h2.getCell(col);
                cell.value = mon; cell.font = hFont; cell.fill = shFill;
                cell.alignment = {horizontal:'center',vertical:'middle'}; cell.border = border;
                sheet.mergeCells(4, col, 4, col+1);
            });

            // Header row 3: For. / Act.
            const h3 = sheet.addRow([]);
            h3.height = 14;
            [1,2,3].forEach(c => { h3.getCell(c).fill = hFill; h3.getCell(c).border = border; });
            MONTHS_EN.forEach((_,i) => {
                const col = 4 + i*2;
                ['For.','Act.'].forEach((lbl, j) => {
                    const cell = h3.getCell(col+j);
                    cell.value = lbl; cell.font = {bold:true, color:{argb:'FFCBD5E1'}, size:8};
                    cell.fill = shFill; cell.alignment = {horizontal:'center',vertical:'middle'};
                    cell.border = border;
                });
            });

            // Data rows
            sectionIds.forEach((indId, rIdx) => {
                const ind = groupedData[indId];
                const rowData = [rIdx+1, ind.name, '-'];
                MONTHS_EN.forEach((_,mIdx) => {
                    const mk = `${MONTHS_ID[mIdx]} ${selectedYear}`;
                    const d = ind.data[mk] || {};
                    rowData.push(d.forecast || '-');
                    rowData.push(d.actual   || '-');
                });
                const dr = sheet.addRow(rowData);
                dr.height = 15;
                for (let c=1; c<=TOTAL_COLS; c++) {
                    const cell = dr.getCell(c);
                    cell.font = { size:9, color:{argb:'FFE2E8F0'} };
                    cell.alignment = { horizontal: c<=2?'left':'center', vertical:'middle' };
                    cell.border = border;
                }
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `Recap_${yearFilter.value}.xlsx`; a.click();
        URL.revokeObjectURL(url);
    });

    // Initial load
    fetchRecapData();
});
