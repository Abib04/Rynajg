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
            previous: document.getElementById('previous').value.trim()
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

    // Click to upload
    uploadZone.addEventListener('click', () => imgInput.click());
    imgInput.addEventListener('change', (e) => { if (e.target.files[0]) processImage(e.target.files[0]); });

    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault(); uploadZone.classList.remove('drag-over');
        if (e.dataTransfer.files[0]) processImage(e.dataTransfer.files[0]);
    });

    // ─── Run Tesseract OCR ─────────────────────────────────────────
    const processImage = async (file) => {
        // Show preview
        const url = URL.createObjectURL(file);
        imgPreview.src = url;
        imgPreview.classList.remove('d-none');
        document.getElementById('upload-placeholder').classList.add('d-none');

        // Show progress
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
            const text = result.data.text;
            extractedRows = parseForexHistoryText(text);
            renderExtractedRows(extractedRows);
        } catch (err) {
            ocrStatusText.textContent = 'OCR gagal: ' + err.message;
        } finally {
            ocrProgress.style.display = 'none';
        }
    };

    // ─── Parse OCR text into data rows ─────────────────────────────
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const parseForexHistoryText = (rawText) => {
        const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 3);
        const rows = [];

        // Match lines that START with a month abbreviation (date lines)
        // e.g.  "Feb 20, 2026    2.7%    0.2%    -0.9%"
        const monthPattern = new RegExp(`^(${MONTHS.join('|')})\\s+(\\d{1,2})[,.]?\\s+(\\d{4})`, 'i');
        const valuePattern = /(-?\d+\.?\d*)\s*(%|K|B|M|T)?/gi;

        for (const line of lines) {
            const dateMatch = line.match(monthPattern);
            if (!dateMatch) continue;

            const month = dateMatch[1];
            const day = dateMatch[2];
            const year = dateMatch[3];
            const dateStr = `${month} ${day}, ${year}`;

            // Extract all numbers from the rest of the line (after the date)
            const afterDate = line.slice(dateMatch[0].length).replace(/[|iltI]/g, ''); // clean OCR chars

            const numbers = [];
            let m;
            const re = /(-?\d+\.?\d*\s*[%KkMmBbTt]?)/g;
            while ((m = re.exec(afterDate)) !== null) {
                const raw = m[1].trim();
                if (raw.length > 0) numbers.push(raw);
            }

            // We expect: [actual, forecast, previous] in that order
            if (numbers.length >= 1) {
                rows.push({
                    date: dateStr,
                    actual: numbers[0] || '',
                    forecast: numbers[1] || '',
                    previous: numbers[2] || '',
                });
            }
        }
        return rows;
    };

    // ─── Render extracted rows as preview cards ─────────────────────
    const renderExtractedRows = (rows) => {
        if (rows.length === 0) {
            extractedList.innerHTML = '<div class="text-warning small">Tidak ada baris data terdeteksi. Coba gunakan screenshot yang lebih jelas.</div>';
            extractedSection.classList.remove('d-none');
            rowCountBadge.textContent = '0';
            return;
        }

        rowCountBadge.textContent = rows.length;
        extractedList.innerHTML = '';
        rows.forEach((row, i) => {
            const div = document.createElement('div');
            div.className = 'extracted-row d-flex gap-3 flex-wrap align-items-center';
            div.innerHTML = `
                <span class="text-info fw-semibold" style="min-width:110px;">${row.date}</span>
                <span>Actual: <strong class="text-success">${row.actual}</strong></span>
                <span>Forecast: <strong>${row.forecast}</strong></span>
                <span>Previous: <strong>${row.previous}</strong></span>
                <button class="btn btn-outline-danger btn-sm py-0 ms-auto" onclick="removeRow(${i})" style="font-size:0.7rem;">✕ Hapus</button>
            `;
            extractedList.appendChild(div);
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
