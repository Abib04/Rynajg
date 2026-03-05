document.addEventListener('DOMContentLoaded', () => {
    const indicatorSelect = document.getElementById('indicator');
    const form = document.getElementById('admin-form');
    const alertBox = document.getElementById('alert-box');
    const saveBtn = document.getElementById('save-btn');
    const logBody = document.getElementById('log-body');

    let indicatorsList = [];
    let logEntries = [];

    // Detect if running on localhost or vercel
    const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';

    // Load custom indicators
    const loadIndicators = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/indicators`);
            const data = await res.json();
            if (data.success && data.data) {
                indicatorsList = data.data;
                indicatorSelect.innerHTML = '<option value="">-- Choose Indicator (1 - 52) --</option>';
                indicatorsList.forEach(ind => {
                    const opt = document.createElement('option');
                    opt.value = ind.id;
                    opt.textContent = `${ind.id} - ${ind.name} (${ind.category})`;
                    indicatorSelect.appendChild(opt);
                });
            }
        } catch (error) {
            showAlert('danger', 'Failed to load indicators from server. Make sure API is running.');
        }
    };

    // Show Alert
    const showAlert = (type, message) => {
        alertBox.className = `alert alert-${type}`;
        alertBox.textContent = message;
        alertBox.classList.remove('d-none');
        setTimeout(() => alertBox.classList.add('d-none'), 5000);
    };

    const updateLogs = (entry, indId, status) => {
        if (logEntries.length === 0) logBody.innerHTML = ''; // clear placeholder

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${indId}</td>
            <td>${entry.date}</td>
            <td class="text-success">${entry.actual || '-'}</td>
            <td>${entry.forecast || '-'}</td>
            <td>${entry.previous || '-'}</td>
            <td><span class="badge ${status === 'added' ? 'bg-primary' : 'bg-warning text-dark'}">${status}</span></td>
        `;
        logBody.prepend(row);
        logEntries.push(entry);
    };

    // Handle Submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const payload = {
            indicator_id: indicatorSelect.value,
            date: document.getElementById('date').value,
            actual: document.getElementById('actual').value,
            forecast: document.getElementById('forecast').value,
            previous: document.getElementById('previous').value
        };

        if (!payload.indicator_id || !payload.date) {
            showAlert('danger', 'ID and Date are required!');
            return;
        }

        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/api/save_manual_data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success) {
                showAlert('success', `Success: Data ${data.action} to cloud database!`);
                updateLogs(data.data, payload.indicator_id, data.action);

                // Keep the selection but clear values for rapid entry
                document.getElementById('actual').value = '';
                document.getElementById('forecast').value = '';
                document.getElementById('previous').value = '';
                // Optional: Increment day automatically or leave date alone
                document.getElementById('date').focus();
            } else {
                showAlert('danger', `Error: ${data.message || 'Server error'}`);
            }
        } catch (error) {
            showAlert('danger', 'Network error while attempting to save data.');
        } finally {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }
    });

    loadIndicators();
});
