document.addEventListener('DOMContentLoaded', () => {
    const alertBox = document.getElementById('alert-box');
    const saveBtn = document.getElementById('save-btn');
    const logBody = document.getElementById('log-body');
    let logEntries = [];

    const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';

    // ─── Load Indicators ───────────────────────────────────────────
    const loadIndicators = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/indicators`);
            const data = await res.json();
            if (data.success && data.data) {
                ['indicator', 'ocr-indicator'].forEach(id => {
                    const sel = document.getElementById(id);
                    sel.innerHTML = '<option value="">-- Pilih Indikator --</option>';
                    data.data.forEach(ind => {
                        const opt = document.createElement('option');
                        opt.value = ind.id;
                        opt.textContent = `${ind.id} - ${ind.name} (${ind.category})`;
                        sel.appendChild(opt);
                    });
                });
            }
        } catch (e) {
            showAlert('danger', 'Gagal memuat indikator. Pastikan server berjalan.');
        }
    };

    // ─── Alert helpers ─────────────────────────────────────────────
    const showAlert = (type, msg, elId = 'alert-box') => {
        const el = document.getElementById(elId);
        el.className = `alert alert-${type}`;
        el.textContent = msg;
        el.classList.remove('d-none');
        setTimeout(() => el.classList.add('d-none'), 7000);
    };

    const addLog = (indId, entry, status) => {
        if (logEntries.length === 0) logBody.innerHTML = '';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${indId}</td>
            <td>${entry.date}</td>
            <td class="text-success">${entry.actual || '-'}</td>
            <td>${entry.forecast || '-'}</td>
            <td>${entry.previous || '-'}</td>
            <td>${entry.movementBefore || '-'}</td>
            <td>${entry.movementAfter || '-'}</td>
            <td><span class="badge ${status === 'added' ? 'bg-primary' : 'bg-warning text-dark'}">${status}</span></td>`;
        logBody.prepend(row);
        logEntries.push(entry);
    };

    // ─── Save one entry to Firebase ────────────────────────────────
    const saveEntry = async (indicatorId, entry) => {
        const res = await fetch(`${API_BASE}/api/save_manual_data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ indicator_id: indicatorId, ...entry })
        });
        return await res.json();
    };

    // ─── Manual Form ───────────────────────────────────────────────
    document.getElementById('admin-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const indicatorId = document.getElementById('indicator').value;
        const entry = {
            date: document.getElementById('date').value.trim(),
            actual: document.getElementById('actual').value.trim(),
            forecast: document.getElementById('forecast').value.trim(),
            previous: document.getElementById('previous').value.trim(),
            movementBefore: document.getElementById('movement-before').value.trim(),
            movementAfter: document.getElementById('movement-after').value.trim()
        };
        if (!indicatorId || !entry.date) { showAlert('danger', 'Indikator dan Tanggal wajib diisi!'); return; }

        const origText = saveBtn.textContent;
        saveBtn.textContent = 'Menyimpan...'; saveBtn.disabled = true;
        try {
            const data = await saveEntry(indicatorId, entry);
            if (data.success) {
                showAlert('success', `Sukses: Data ${data.action} ke Firebase!`);
                addLog(indicatorId, data.data, data.action);
                document.getElementById('actual').value = '';
                document.getElementById('forecast').value = '';
                document.getElementById('previous').value = '';
                document.getElementById('movement-before').value = '';
                document.getElementById('movement-after').value = '';
            } else {
                showAlert('danger', `Error: ${data.message}`);
            }
        } catch (err) {
            showAlert('danger', 'Gagal terhubung ke server.');
        } finally {
            saveBtn.textContent = origText; saveBtn.disabled = false;
        }
    });

    // ─── OCR IMAGE UPLOAD ──────────────────────────────────────────
    const uploadZone = document.getElementById('upload-zone');
    const imgInput = document.getElementById('img-input');
    const imgPreview = document.getElementById('img-preview');
    const ocrProgress = document.getElementById('ocr-progress');
    const ocrStatusText = document.getElementById('ocr-status-text');
    const ocrBar = document.getElementById('ocr-bar');
    const extractedSection = document.getElementById('extracted-section');
    const extractedList = document.getElementById('extracted-list');
    const rowCountBadge = document.getElementById('row-count');
    const bulkSaveBtn = document.getElementById('bulk-save-btn');

    let extractedRows = [];

    // Click to upload — stop propagation from child inputs
    uploadZone.addEventListener('click', (e) => {
        // Only trigger file picker when clicking the zone itself, not child inputs/buttons
        if (e.target === uploadZone || e.target.id === 'upload-placeholder' || e.target.closest('#upload-placeholder')) {
            imgInput.click();
        }
    });
    imgInput.addEventListener('change', (e) => { if (e.target.files[0]) processImage(e.target.files[0]); });

    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault(); uploadZone.classList.remove('drag-over');
        if (e.dataTransfer.files[0]) processImage(e.dataTransfer.files[0]);
    });

    // ─── Run Tesseract OCR with word-level bounding boxes ──────────
    const processImage = async (file) => {
        const url = URL.createObjectURL(file);
        imgPreview.src = url;
        imgPreview.classList.remove('d-none');
        document.getElementById('upload-placeholder').classList.add('d-none');

        ocrProgress.style.display = 'block';
        extractedSection.classList.add('d-none');
        extractedRows = [];

        try {
            const result = await Tesseract.recognize(file, 'eng', {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        const pct = Math.round(m.progress * 100);
                        ocrBar.style.width = pct + '%';
                        ocrStatusText.textContent = `Membaca teks... ${pct}%`;
                    }
                }
            });

            ocrStatusText.textContent = 'Memproses hasil OCR...';
            // Use word-level data with bounding boxes for accurate column reconstruction
            extractedRows = parseByBoundingBox(result.data.words);
            // If that fails, fall back to raw text
            if (extractedRows.length === 0) {
                extractedRows = parseForexHistoryText(result.data.text);
            }
            renderExtractedRows(extractedRows);
        } catch (err) {
            ocrStatusText.textContent = 'OCR gagal: ' + err.message;
            console.error(err);
        } finally {
            ocrProgress.style.display = 'none';
        }
    };

    // ─── Post-process OCR value to fix common errors ───────────────
    const cleanValue = (raw) => {
        if (!raw) return '';
        raw = raw.trim().replace(/\.$/, '').replace(/,$/, ''); // remove trailing dot/comma
        if (!raw) return '';
        // Already has a recognised unit suffix
        if (/[%KMBTkmbt]$/i.test(raw)) {
            const suffix = raw.slice(-1).toUpperCase();
            const noSuffix = raw.slice(0, -1);
            const num = parseFloat(noSuffix);
            // Fix "11%" → "1.1%" (OCR missed decimal point, works for 2-digit ints with %)
            if (!isNaN(num) && suffix === '%' && Number.isInteger(num) && Math.abs(num) >= 10 && Math.abs(num) <= 99) {
                const sign = num < 0 ? '-' : '';
                const abs = String(Math.abs(num));
                return `${sign}${abs[0]}.${abs.slice(1)}%`;
            }
            return raw; // K/M/B/T stay as-is
        }
        const num = parseFloat(raw.replace(',', '.'));
        if (isNaN(num)) return raw;
        // 2-digit integer without suffix → insert decimal ("11" → "1.1%")
        if (Number.isInteger(num) && Math.abs(num) >= 10 && Math.abs(num) <= 99) {
            const sign = num < 0 ? '-' : '';
            const abs = String(Math.abs(num));
            return `${sign}${abs[0]}.${abs.slice(1)}%`;
        }
        // Small value (< 10) without % → assume percentage
        if (Math.abs(num) < 10) return String(num) + '%';
        return raw;
    };

    const MONTHS_MAP = {
        jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr', may: 'May', jun: 'Jun',
        jul: 'Jul', aug: 'Aug', sep: 'Sep', oct: 'Oct', nov: 'Nov', dec: 'Dec'
    };
    const MONTH_KEYS = Object.keys(MONTHS_MAP).join('|');
    const MONTH_RE = new RegExp(`^(${MONTH_KEYS})$`, 'i');

    // ─── Strategy 1: Bounding Box (most accurate for tables) ───────
    const parseByBoundingBox = (words) => {
        if (!words || words.length === 0) return [];

        // Group words into visual rows based on vertical (Y) center proximity
        const rows = [];
        const ROW_TOLERANCE = 12; // px — words within 12px vertically = same row

        for (const word of words) {
            const text = word.text.replace(/[\u2019''`]/g, "'").trim();
            if (!text || text.length < 1) continue;
            const yCenter = (word.bbox.y0 + word.bbox.y1) / 2;

            // Find an existing row close enough
            let foundRow = null;
            for (const row of rows) {
                if (Math.abs(row.yCenter - yCenter) <= ROW_TOLERANCE) {
                    foundRow = row;
                    break;
                }
            }
            if (foundRow) {
                foundRow.words.push({ text, x: word.bbox.x0 });
                // Update yCenter as average
                foundRow.yCenter = (foundRow.yCenter + yCenter) / 2;
            } else {
                rows.push({ yCenter, words: [{ text, x: word.bbox.x0 }] });
            }
        }

        // Sort rows by y, words within each row by x (left→right)
        rows.sort((a, b) => a.yCenter - b.yCenter);
        rows.forEach(r => r.words.sort((a, b) => a.x - b.x));

        // Identify date rows: rows that contain a month word followed by a day number and year
        const dataRows = [];

        for (const row of rows) {
            const texts = row.words.map(w => w.text);
            const joined = texts.join(' ');

            // Look for a month name in this row
            const dateRe = new RegExp(`(${MONTH_KEYS})[\\.']?\\s*(\\d{1,2})[,.]?\\s*(20\\d{2})`, 'i');
            const dm = joined.match(dateRe);
            if (!dm) continue;

            const mon = MONTHS_MAP[dm[1].toLowerCase()] || dm[1];
            const dateStr = `${mon} ${parseInt(dm[2])}, ${dm[3]}`;

            // KEY FIX: Only collect numeric values positioned to the RIGHT of the year.
            // This prevents day numbers like '20,' from being misread as Actual values.
            const year = dm[3]; // e.g. "2026"
            const yearWord = row.words.find(w => w.text.replace(/[,.\/]/g, '') === year);
            const minX = yearWord ? yearWord.x + 5 : -1;

            const numRe = /^-?\d+[.,]?\d*[%KMBTkmbté]?$/i;
            const valueWords = row.words
                .filter(w => {
                    if (minX >= 0 && w.x <= minX) return false; // must be right of year
                    const t = w.text.replace(/[,.]$/, ''); // strip trailing punctuation
                    return numRe.test(t) || /^-?\d+[.,]?\d*$/.test(t);
                })
                .map(w => w.text.replace(/[,]$/, ''));

            dataRows.push({
                date: dateStr,
                actual: cleanValue(valueWords[0] || ''),
                forecast: cleanValue(valueWords[1] || ''),
                previous: cleanValue(valueWords[2] || ''),
                movementBefore: '',
                movementAfter: ''
            });
        }

        return dataRows;
    };

    // ─── Strategy 2: Flat text fallback ────────────────────────────
    const parseForexHistoryText = (rawText) => {
        const fullText = rawText.replace(/\r/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ');
        const dateRe = new RegExp(`(${MONTH_KEYS})\\.?\\s*(\\d{1,2})[,.]?\\s*(202\\d|201\\d)`, 'gi');
        const dates = [];
        let dm;
        while ((dm = dateRe.exec(fullText)) !== null) {
            const mon = MONTHS_MAP[dm[1].toLowerCase()] || dm[1];
            dates.push({ date: `${mon} ${parseInt(dm[2])}, ${dm[3]}`, endPos: dm.index + dm[0].length });
        }
        if (dates.length === 0) return [];

        const rows = [];
        for (let i = 0; i < dates.length; i++) {
            const start = dates[i].endPos;
            const end = i + 1 < dates.length ? dates[i + 1].endPos - 15 : fullText.length;
            const chunk = fullText.slice(start, Math.max(start, end));
            const numRe = /(-?\d+\.?\d*)\s*(%|K|M|B|T)?/gi;
            const nums = []; let nm;
            while ((nm = numRe.exec(chunk)) !== null) {
                if (nm[1].length > 0 && parseFloat(nm[1]) < 10000)
                    nums.push(nm[1] + (nm[2] ? nm[2].toUpperCase() : ''));
            }
            rows.push({
                date: dates[i].date,
                actual: cleanValue(nums[0] || ''),
                forecast: cleanValue(nums[1] || ''),
                previous: cleanValue(nums[2] || ''),
                movementBefore: '',
                movementAfter: ''
            });
        }
        return rows;
    };

    // ─── Render extracted rows as EDITABLE preview cards ───────────
    const renderExtractedRows = (rows) => {
        if (rows.length === 0) {
            extractedList.innerHTML = '<div class="text-warning small">Tidak ada baris data terdeteksi. Coba gunakan screenshot yang lebih jelas.</div>';
            extractedSection.classList.remove('d-none');
            rowCountBadge.textContent = '0';
            return;
        }

        rowCountBadge.textContent = rows.length;
        extractedList.innerHTML = '';

        const inputStyle = `
            background: rgba(15,23,42,0.9);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 6px;
            color: #f8fafc;
            font-size: 0.8rem;
            padding: 2px 6px;
            width: 80px;
            outline: none;
        `;
        const dateInputStyle = inputStyle.replace('width: 80px', 'width: 110px');

        rows.forEach((row, i) => {
            const div = document.createElement('div');
            div.className = 'extracted-row';
            div.style.cssText = 'display:flex; gap:8px; flex-wrap:wrap; align-items:center; padding:0.5rem 0.75rem;';
            div.innerHTML = `
                <span class="text-secondary" style="font-size:0.7rem; min-width:18px;">#${i + 1}</span>
                <input class="ocr-field" data-idx="${i}" data-field="date"
                    value="${row.date}" placeholder="Date"
                    style="${dateInputStyle}" title="Tanggal" />
                <label style="font-size:0.78rem; color:#94a3b8; margin:0;">Actual:</label>
                <input class="ocr-field" data-idx="${i}" data-field="actual"
                    value="${row.actual}" placeholder="e.g. 0.3%"
                    style="${inputStyle} color:#4ade80;" title="Actual" />
                <label style="font-size:0.78rem; color:#94a3b8; margin:0;">Forecast:</label>
                <input class="ocr-field" data-idx="${i}" data-field="forecast"
                    value="${row.forecast}" placeholder="e.g. 0.2%"
                    style="${inputStyle}" title="Forecast" />
                <label style="font-size:0.78rem; color:#94a3b8; margin:0;">Previous:</label>
                <input class="ocr-field" data-idx="${i}" data-field="previous"
                    value="${row.previous}" placeholder="e.g. 0.1%"
                    style="${inputStyle}" title="Previous" />
                <label style="font-size:0.78rem; color:#94a3b8; margin:0;">Mvmt Bef:</label>
                <input class="ocr-field" type="number" step="any" data-idx="${i}" data-field="movementBefore"
                    value="${row.movementBefore || ''}" placeholder="e.g. 50"
                    style="${inputStyle.replace('width: 80px', 'width: 60px')}" title="Movement Before" />
                <label style="font-size:0.78rem; color:#94a3b8; margin:0;">Mvmt Aft:</label>
                <input class="ocr-field" type="number" step="any" data-idx="${i}" data-field="movementAfter"
                    value="${row.movementAfter || ''}" placeholder="e.g. -20"
                    style="${inputStyle.replace('width: 80px', 'width: 60px')}" title="Movement After" />
                <button class="btn btn-outline-danger btn-sm py-0 ms-auto"
                    onclick="removeRow(${i})" style="font-size:0.7rem;">✕</button>
            `;
            extractedList.appendChild(div);
        });

        // Live sync: update extractedRows when user edits any field
        extractedList.querySelectorAll('.ocr-field').forEach(input => {
            input.addEventListener('input', (e) => {
                const idx = parseInt(e.target.dataset.idx);
                const field = e.target.dataset.field;
                extractedRows[idx][field] = e.target.value;
            });
        });

        extractedSection.classList.remove('d-none');
    };

    window.removeRow = (i) => {
        extractedRows.splice(i, 1);
        renderExtractedRows(extractedRows);
    };

    // ─── Bulk Save all extracted rows ──────────────────────────────
    bulkSaveBtn.addEventListener('click', async () => {
        const indId = document.getElementById('ocr-indicator').value;
        if (!indId) { showAlert('danger', 'Pilih indikator terlebih dahulu!', 'ocr-alert'); return; }
        if (extractedRows.length === 0) { showAlert('warning', 'Tidak ada data untuk disimpan.', 'ocr-alert'); return; }

        bulkSaveBtn.textContent = 'Menyimpan...'; bulkSaveBtn.disabled = true;
        let saved = 0, failed = 0;

        for (const entry of extractedRows) {
            try {
                const data = await saveEntry(indId, entry);
                if (data.success) { addLog(indId, data.data, data.action); saved++; }
                else failed++;
            } catch { failed++; }
        }

        bulkSaveBtn.textContent = '💾 Simpan Semua ke Firebase';
        bulkSaveBtn.disabled = false;

        const msg = `Selesai! ${saved} data berhasil disimpan${failed > 0 ? `, ${failed} gagal.` : '.'}`;
        showAlert(failed > 0 ? 'warning' : 'success', msg, 'ocr-alert');

        if (saved > 0) {
            extractedRows = [];
            renderExtractedRows([]);
        }
    });

    loadIndicators();
});
