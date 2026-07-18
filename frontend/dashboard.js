/* ═══════════════════════════════════════════════════════════════════
   dashboard.js — Admin Dashboard Logic
   All API calls, routing, and page interactions.
   The existing /api/faculty endpoint is untouched.
═══════════════════════════════════════════════════════════════════ */

'use strict';

// ─── CONFIG ─────────────────────────────────────────────────────────────────
// Auto-detects environment: works on localhost AND on deployed Render/Netlify
const IS_LOCAL  = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const BASE_URL  = IS_LOCAL
    ? 'http://localhost:8000'           // local dev (backend/.env PORT=8000)
    : 'https://faculty-onlineclass.onrender.com'; // Render production

const API = {
    staff:        `${BASE_URL}/api/faculty`,
    invoices:     `${BASE_URL}/api/invoices`,
    invigilation: `${BASE_URL}/api/invigilation`
};

// ─── AUTH GUARD ──────────────────────────────────────────────────────────────
if (sessionStorage.getItem('adminAuth') !== 'true') {
    window.location.href = 'login.html';
}
const ADMIN_USER = sessionStorage.getItem('adminUser') || 'admin';

// Set admin name in UI
document.getElementById('sidebarAdminName').textContent  = ADMIN_USER;
document.getElementById('sidebarAdminInitial').textContent = ADMIN_USER.charAt(0).toUpperCase();
document.getElementById('topbarName').textContent         = ADMIN_USER;
document.getElementById('topbarInitial').textContent      = ADMIN_USER.charAt(0).toUpperCase();

// ─── LOGOUT ──────────────────────────────────────────────────────────────────
document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.clear();
    window.location.href = 'login.html';
});

// ─── SIDEBAR TOGGLE ──────────────────────────────────────────────────────────
const sidebar     = document.getElementById('sidebar');
const mainWrapper = document.getElementById('mainWrapper');
const toggleIcon  = document.getElementById('toggleIcon');

document.getElementById('sidebarToggle').addEventListener('click', () => {
    const collapsed = sidebar.classList.toggle('collapsed');
    mainWrapper.classList.toggle('collapsed', collapsed);
    toggleIcon.className = collapsed ? 'fa-solid fa-chevron-right' : 'fa-solid fa-chevron-left';
    localStorage.setItem('sidebarCollapsed', collapsed);
});

// Restore sidebar state
if (localStorage.getItem('sidebarCollapsed') === 'true') {
    sidebar.classList.add('collapsed');
    mainWrapper.classList.add('collapsed');
    toggleIcon.className = 'fa-solid fa-chevron-right';
}

// ─── ROUTER ──────────────────────────────────────────────────────────────────
const PAGE_LABELS = {
    'dashboard':    'Dashboard',
    'user-details': 'User Details',
    'invigilation': 'Invigilation Chart',
    'invoice':      'Statement / Invoice',
    'reg-invoices': 'Registered Invoices',
    'settings':     'Settings'
};

let currentPage = 'dashboard';

function navigate(page) {
    if (page === currentPage) return;
    currentPage = page;

    // Switch sections
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`page-${page}`);
    if (target) target.classList.add('active');

    // Update nav
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    // Breadcrumb
    document.getElementById('breadcrumbPage').textContent = PAGE_LABELS[page] || page;

    // Lazy-init each page
    switch (page) {
        case 'dashboard':    initDashboard();    break;
        case 'user-details': initUserDetails();  break;
        case 'invigilation': initInvigilation(); break;
        case 'invoice':      initInvoicePage();  break;
        case 'reg-invoices': initRegInvoices();  break;
    }
}

// Attach nav click
document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => navigate(item.dataset.page));
});

// ─── TOAST ───────────────────────────────────────────────────────────────────
function toast(type, message) {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;

    const icons = { success: 'circle-check', error: 'circle-exclamation', info: 'circle-info', warning: 'triangle-exclamation' };
    el.innerHTML = `<i class="fa-solid fa-${icons[type] || 'info'}"></i><span>${message}</span>`;
    container.appendChild(el);

    setTimeout(() => {
        el.classList.add('removing');
        setTimeout(() => el.remove(), 350);
    }, 4000);
}

// ─── API HELPER ──────────────────────────────────────────────────────────────
async function apiFetch(url, options = {}) {
    const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options
    });
    const data = await res.json().catch(() => ({ success: false, message: 'Invalid server response.' }));
    if (!res.ok && !data.success) throw new Error(data.message || `HTTP ${res.status}`);
    return data;
}

// ─── MODAL UTILS ─────────────────────────────────────────────────────────────
function openModal(id) {
    document.getElementById(id).classList.add('open');
}
function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}

// Close on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.classList.remove('open');
    });
});

// ─── FORMAT HELPERS ──────────────────────────────────────────────────────────
function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtDateTime(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtCurrency(n) {
    return '₹' + Number(n || 0).toLocaleString('en-IN');
}

// ─── VALIDATION ──────────────────────────────────────────────────────────────
function validateField(inputId, errId, condition, msg) {
    const el  = document.getElementById(inputId);
    const err = document.getElementById(errId);
    if (!condition) {
        el.classList.add('is-invalid'); el.classList.remove('is-valid');
        if (err) { err.textContent = msg; err.classList.add('show'); }
        return false;
    }
    el.classList.remove('is-invalid'); el.classList.add('is-valid');
    if (err) err.classList.remove('show');
    return true;
}

// ═══════════════════════════════════════════════════════════════════
// PAGE 1: DASHBOARD
// ═══════════════════════════════════════════════════════════════════
async function initDashboard() {
    try {
        const [statsRes, invoicesRes] = await Promise.all([
            apiFetch(`${API.staff}/stats`),
            apiFetch(`${API.invoices}?limit=1`)
        ]);

        if (statsRes.success) {
            const d = statsRes.data;
            document.getElementById('ds-total').textContent    = d.total || 0;
            document.getElementById('ds-active').textContent   = d.active || 0;
            document.getElementById('ds-available').textContent= d.available || 0;

            // Count invigilators
            const invigRole = (d.roleBreakdown || []).find(r => r._id === 'Invigilator');
            document.getElementById('ds-invig').textContent = invigRole ? invigRole.count : 0;

            // Recent registrations
            const tbody = document.getElementById('recentRegistrations');
            if (d.recent && d.recent.length) {
                tbody.innerHTML = d.recent.map(s => `
                    <tr>
                        <td>${s.name}</td>
                        <td><span class="badge badge-purple">${s.role}</span></td>
                        <td>${s.department || '—'}</td>
                        <td>${fmtDateTime(s.registrationDate)}</td>
                    </tr>`).join('');
            } else {
                tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><i class="fa-solid fa-inbox"></i><p>No recent registrations</p></div></td></tr>`;
            }

            // Role breakdown
            const rbEl = document.getElementById('roleBreakdown');
            if (d.roleBreakdown && d.roleBreakdown.length) {
                rbEl.innerHTML = d.roleBreakdown.map(r => `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border-light)">
                        <span style="font-size:.8rem;color:var(--text-secondary)">${r._id}</span>
                        <span class="badge badge-purple">${r.count}</span>
                    </div>`).join('');
            } else {
                rbEl.innerHTML = `<div class="empty-state" style="padding:20px"><p>No data yet</p></div>`;
            }
        }

        if (invoicesRes.success) {
            document.getElementById('ds-invoices').textContent = invoicesRes.pagination?.total || 0;
        }
    } catch (err) {
        console.warn('Dashboard load error:', err.message);
    }
}

function refreshDashboard() { initDashboard(); toast('info', 'Dashboard refreshed.'); }

// ═══════════════════════════════════════════════════════════════════
// PAGE 3: USER DETAILS
// ═══════════════════════════════════════════════════════════════════
let udPage = 1, udLimit = 10, udSort = 'registrationDate', udOrder = 'desc', udSearch = '', udRole = 'All', udStatus = 'All';

async function initUserDetails() { await loadUserDetails(); }

async function loadUserDetails() {
    const tbody = document.getElementById('udTableBody');
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px"><div class="spinner" style="margin:0 auto"></div></td></tr>`;

    try {
        const res = await apiFetch(API.staff);
        if (!res.success) { toast('error', res.message); return; }

        const allData = res.data || [];

        // 1. Client-side filtering
        let filtered = allData.filter(s => {
            const nameMatch = !udSearch || (s.facultyName || '').toLowerCase().includes(udSearch.toLowerCase());
            const regIdMatch = !udSearch || (s.regId || '').toLowerCase().includes(udSearch.toLowerCase());
            const phoneMatch = !udSearch || (s.mobileNumber || '').includes(udSearch);
            const matchesSearch = nameMatch || regIdMatch || phoneMatch;

            const matchesRole   = udRole === 'All' || s.qualification === udRole;
            const matchesStatus = udStatus === 'All' || s.status === udStatus;

            return matchesSearch && matchesRole && matchesStatus;
        });

        // 2. Client-side sorting
        filtered.sort((a, b) => {
            let valA = a[udSort];
            let valB = b[udSort];

            if (udSort === 'name') { valA = a.facultyName; valB = b.facultyName; }
            if (udSort === 'role') { valA = a.qualification; valB = b.qualification; }
            if (udSort === 'phone') { valA = a.mobileNumber; valB = b.mobileNumber; }
            if (udSort === 'email') { valA = a.collegeEmail; valB = b.collegeEmail; }

            valA = valA || '';
            valB = valB || '';

            if (typeof valA === 'string') {
                return udOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            } else {
                return udOrder === 'asc' ? (valA - valB) : (valB - valA);
            }
        });

        // 3. Client-side pagination
        const total = filtered.length;
        const totalPages = Math.ceil(total / udLimit);
        const startIdx = (udPage - 1) * udLimit;
        const pageData = filtered.slice(startIdx, startIdx + udLimit);

        document.getElementById('ud-subtitle').textContent = `${total} registered faculty member(s)`;

        if (!total) {
            tbody.innerHTML = '';
            document.getElementById('udEmpty').style.display = 'block';
        } else {
            document.getElementById('udEmpty').style.display = 'none';
            tbody.innerHTML = pageData.map((s, i) => `
                <tr>
                    <td style="color:var(--text-muted)">${startIdx + i + 1}</td>
                    <td><strong>${s.facultyName}</strong></td>
                    <td><span class="badge badge-purple">${s.qualification || '—'}</span></td>
                    <td>${s.mobileNumber || '—'}</td>
                    <td style="color:var(--text-secondary);font-size:.8rem">${s.collegeEmail || '—'}</td>
                    <td style="font-size:.8rem;color:var(--text-muted)">${s.bankAccount || '—'}</td>
                    <td style="font-size:.78rem;color:var(--text-muted)">${fmtDateTime(s.registrationDate)}</td>
                    <td>
                        <div class="table-actions">
                            <button class="act-btn act-btn-view"   onclick="viewStaff('${s._id}')"   title="View">   <i class="fa-solid fa-eye"></i></button>
                            <button class="act-btn act-btn-edit"   onclick="editStaff('${s._id}')"   title="Edit">   <i class="fa-solid fa-pen"></i></button>
                            <button class="act-btn act-btn-delete" onclick="deleteStaff('${s._id}')" title="Delete"> <i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                </tr>`).join('');
        }

        renderPagination('udPagination', {
            total,
            page: udPage,
            limit: udLimit,
            totalPages
        }, (p) => { udPage = p; loadUserDetails(); });
    } catch (err) {
        toast('error', 'Failed to load user details: ' + err.message);
    }
}

// Search
let udSearchTimer;
document.getElementById('udSearch').addEventListener('input', e => {
    clearTimeout(udSearchTimer);
    udSearchTimer = setTimeout(() => { udSearch = e.target.value.trim(); udPage = 1; loadUserDetails(); }, 350);
});
document.getElementById('udRoleFilter').addEventListener('change',   e => { udRole   = e.target.value; udPage = 1; loadUserDetails(); });
document.getElementById('udStatusFilter').addEventListener('change', e => { udStatus = e.target.value; udPage = 1; loadUserDetails(); });

// Excel export
document.getElementById('udExcelBtn').addEventListener('click', async () => {
    const btn = document.getElementById('udExcelBtn');
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating…';
    try {
        const res = await fetch(`${API.staff}/download/excel`);
        if (!res.ok) { toast('error', 'Excel export failed.'); return; }
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `Faculty_Records_${Date.now()}.xlsx`;
        a.click(); a.remove();
        toast('success', 'Excel downloaded successfully!');
    } catch { toast('error', 'Download failed.'); }
    finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-file-excel"></i> Export to Excel'; }
});

// ─── VIEW STAFF ───────────────────────────────────────────────────
async function viewStaff(id) {
    try {
        const res = await apiFetch(`${API.staff}/${id}`);
        if (!res.success) return;
        const d = res.data;
        document.getElementById('viewStaffBody').innerHTML = `
            <div class="detail-grid">
                <div class="detail-item"><label>Name</label><span>${d.facultyName}</span></div>
                <div class="detail-item"><label>Role</label><span><span class="badge badge-purple">${d.qualification}</span></span></div>
                <div class="detail-item"><label>Department</label><span>${d.department || '—'}</span></div>
                <div class="detail-item"><label>Phone</label><span>${d.mobileNumber}</span></div>
                <div class="detail-item"><label>Email</label><span>${d.collegeEmail}</span></div>
                <div class="detail-item"><label>Date of Birth</label><span>${d.dateOfBirth ? fmtDate(d.dateOfBirth) : '—'}</span></div>
                <div class="detail-item"><label>Address</label><span>${d.address || '—'}</span></div>
                <div class="detail-item"><label>Bank Account</label><span>${d.bankAccount}</span></div>
                <div class="detail-item"><label>IFSC Code</label><span>${d.ifscCode}</span></div>
                <div class="detail-item"><label>Experience</label><span>${d.experience || 0} years</span></div>
                <div class="detail-item"><label>Status</label><span><span class="badge ${d.status === 'Active' ? 'badge-green' : 'badge-red'}">${d.status}</span></span></div>
                <div class="detail-item"><label>Availability</label><span>${d.availability}</span></div>
                <div class="detail-item"><label>Reg ID</label><span style="font-size:.78rem;color:var(--text-muted)">${d.regId}</span></div>
                <div class="detail-item"><label>Registered On</label><span>${fmtDateTime(d.registrationDate)}</span></div>
                
                <!-- Documents View Section -->
                <div class="detail-item" style="grid-column: span 2; margin-top: 10px;">
                    <label>Uploaded Documents</label>
                    <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:4px;">
                        ${d.aadhaarFile ? `<a class="btn btn-outline btn-sm" href="${BASE_URL}/uploads/${d.aadhaarFile}" target="_blank"><i class="fa-solid fa-file-pdf"></i> Aadhaar Doc</a>` : ''}
                        ${d.panFile ? `<a class="btn btn-outline btn-sm" href="${BASE_URL}/uploads/${d.panFile}" target="_blank"><i class="fa-solid fa-file-pdf"></i> PAN Doc</a>` : ''}
                        ${d.passportPhoto ? `<a class="btn btn-outline btn-sm" href="${BASE_URL}/uploads/${d.passportPhoto}" target="_blank"><i class="fa-solid fa-image"></i> Passport Photo</a>` : ''}
                    </div>
                </div>
            </div>`;
        openModal('viewStaffModal');
    } catch (err) { toast('error', 'Failed to load details.'); }
}

// ─── EDIT STAFF ───────────────────────────────────────────────────
let initialEditData = {};

const validators = {
    'e-name': (val) => val.length >= 3,
    'e-dept': (val) => val.length > 0,
    'e-phone': (val) => /^[6-9]\d{9}$/.test(val),
    'e-alt-phone': (val) => !val || /^[6-9]\d{9}$/.test(val),
    'e-email': (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    'e-personal-email': (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    'e-father': (val) => val.length > 0,
    'e-mother': (val) => val.length > 0,
    'e-tcs': (val) => true,
    'e-aadhaar': (val) => /^\d{12}$/.test(val),
    'e-pan': (val) => !val || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val),
    'e-bank-name': (val) => val.length > 0,
    'e-bank': (val) => val.length > 0,
    'e-ifsc': (val) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(val),
    'e-exp': (val) => !isNaN(val) && parseInt(val) >= 0
};

const errorMessages = {
    'e-name': 'Required (min 3 chars).',
    'e-dept': 'Required.',
    'e-phone': 'Valid 10-digit number required.',
    'e-alt-phone': 'Valid 10-digit number required.',
    'e-email': 'Valid college email required.',
    'e-personal-email': 'Valid personal email required.',
    'e-father': 'Required.',
    'e-mother': 'Required.',
    'e-aadhaar': 'Valid 12-digit Aadhaar required.',
    'e-pan': 'Valid PAN (e.g. ABCDE1234F) required.',
    'e-bank-name': 'Required.',
    'e-bank': 'Required.',
    'e-ifsc': 'Valid 11-digit IFSC required.',
    'e-exp': 'Must be 0 or greater.'
};

async function editStaff(id) {
    try {
        const res = await apiFetch(`${API.staff}/${id}`);
        if (!res.success) return;
        const d = res.data;

        document.getElementById('edit-staff-id').value = id;

        // Initialize stateful data
        initialEditData = {
            'e-name': d.facultyName || '',
            'e-role': d.qualification || 'B.Tech',
            'e-dept': d.department || '',
            'e-phone': d.mobileNumber || '',
            'e-alt-phone': d.alternateMobile || '',
            'e-email': d.collegeEmail || '',
            'e-personal-email': d.personalEmail || '',
            'e-father': d.fatherName || '',
            'e-mother': d.motherName || '',
            'e-tcs': d.tcsCode || '',
            'e-aadhaar': d.aadhaarNumber || '',
            'e-pan': d.panNumber || '',
            'e-bank-name': d.bankName || '',
            'e-bank': d.bankAccount || '',
            'e-ifsc': d.ifscCode || '',
            'e-exp': d.experience || 0,
            'e-status': d.status || 'Active',
            'e-avail': d.availability || 'Available'
        };

        // Populate fields
        for (const key in initialEditData) {
            const el = document.getElementById(key);
            if (el) el.value = initialEditData[key];
        }

        // Clean validation markers entirely upon opening modal
        document.querySelectorAll('#editStaffModal .form-control').forEach(el => {
            el.classList.remove('is-valid', 'is-invalid');
        });
        document.querySelectorAll('#editStaffModal .form-error').forEach(el => {
            el.classList.remove('show');
        });

        openModal('editStaffModal');
    } catch (err) { toast('error', 'Failed to load staff for editing.'); }
}

document.getElementById('saveEditBtn').addEventListener('click', async () => {
    const id = document.getElementById('edit-staff-id').value;
    
    // Read current data
    const currentEditData = {
        'e-name': document.getElementById('e-name').value.trim(),
        'e-role': document.getElementById('e-role').value,
        'e-dept': document.getElementById('e-dept').value.trim(),
        'e-phone': document.getElementById('e-phone').value.trim(),
        'e-alt-phone': document.getElementById('e-alt-phone').value.trim(),
        'e-email': document.getElementById('e-email').value.trim(),
        'e-personal-email': document.getElementById('e-personal-email').value.trim(),
        'e-father': document.getElementById('e-father').value.trim(),
        'e-mother': document.getElementById('e-mother').value.trim(),
        'e-tcs': document.getElementById('e-tcs').value.trim(),
        'e-aadhaar': document.getElementById('e-aadhaar').value.trim(),
        'e-pan': document.getElementById('e-pan').value.trim().toUpperCase(),
        'e-bank-name': document.getElementById('e-bank-name').value.trim(),
        'e-bank': document.getElementById('e-bank').value.trim(),
        'e-ifsc': document.getElementById('e-ifsc').value.trim().toUpperCase(),
        'e-exp': parseInt(document.getElementById('e-exp').value) || 0,
        'e-status': document.getElementById('e-status').value,
        'e-avail': document.getElementById('e-avail').value
    };

    // Check changes
    let hasChanged = false;
    for (const key in currentEditData) {
        if (currentEditData[key] != initialEditData[key]) {
            hasChanged = true;
            break;
        }
    }

    if (!hasChanged) {
        // Close immediately without saving if no changes detected
        closeModal('editStaffModal');
        toast('info', 'No changes detected.');
        return;
    }

    // Validate only modified fields
    let allOk = true;
    for (const key in currentEditData) {
        const inputEl = document.getElementById(key);
        const errorEl = document.getElementById(key + '-err');

        if (currentEditData[key] != initialEditData[key]) {
            const validator = validators[key];
            if (validator) {
                const isValid = validator(currentEditData[key]);
                const errMsg = errorMessages[key] || 'Invalid value.';
                
                if (inputEl) {
                    if (isValid) {
                        inputEl.classList.remove('is-invalid');
                        inputEl.classList.add('is-valid');
                    } else {
                        inputEl.classList.remove('is-valid');
                        inputEl.classList.add('is-invalid');
                        allOk = false;
                    }
                }
                if (errorEl) {
                    if (isValid) {
                        errorEl.classList.remove('show');
                    } else {
                        errorEl.innerHTML = errMsg;
                        errorEl.classList.add('show');
                    }
                }
            }
        } else {
            // Not changed, clear styling
            if (inputEl) inputEl.classList.remove('is-valid', 'is-invalid');
            if (errorEl) errorEl.classList.remove('show');
        }
    }

    if (!allOk) return;

    const btn = document.getElementById('saveEditBtn');
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…';

    try {
        const payload = {
            facultyName: currentEditData['e-name'],
            qualification: currentEditData['e-role'],
            department: currentEditData['e-dept'],
            mobileNumber: currentEditData['e-phone'],
            alternateMobile: currentEditData['e-alt-phone'] || null,
            collegeEmail: currentEditData['e-email'],
            personalEmail: currentEditData['e-personal-email'],
            fatherName: currentEditData['e-father'],
            motherName: currentEditData['e-mother'],
            tcsCode: currentEditData['e-tcs'] || null,
            aadhaarNumber: currentEditData['e-aadhaar'],
            panNumber: currentEditData['e-pan'] || null,
            bankName: currentEditData['e-bank-name'],
            bankAccount: currentEditData['e-bank'],
            ifscCode: currentEditData['e-ifsc'],
            experience: currentEditData['e-exp'],
            status: currentEditData['e-status'],
            availability: currentEditData['e-avail']
        };
        const res = await apiFetch(`${API.staff}/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        if (res.success) {
            toast('success', 'Staff updated successfully!');
            closeModal('editStaffModal');
            loadUserDetails();
        } else {
            toast('error', res.message);
        }
    } catch (err) { toast('error', err.message || 'Update failed.'); }
    finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes'; }
});

// ─── DELETE STAFF ─────────────────────────────────────────────────
let deleteTargetId = null;
function deleteStaff(id) {
    deleteTargetId = id;
    openModal('deleteModal');
}
document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    if (!deleteTargetId) return;
    const btn = document.getElementById('confirmDeleteBtn');
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting…';
    try {
        const res = await apiFetch(`${API.staff}/${deleteTargetId}`, { method: 'DELETE' });
        closeModal('deleteModal');
        if (res.success) { toast('success', 'Staff deleted successfully.'); loadUserDetails(); }
        else toast('error', res.message);
    } catch (err) { toast('error', err.message || 'Delete failed.'); }
    finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-trash"></i> Delete'; deleteTargetId = null; }
});

// ═══════════════════════════════════════════════════════════════════
// PAGE 4: INVIGILATION CHART
// ═══════════════════════════════════════════════════════════════════
let invigAllStaff      = [];  // all staff from API
let invigChartData     = {};  // _id -> { shift, amount }
let invigFilteredStaff = [];
let invigPage = 1, invigLimit = 10;
let invigSearch = '', invigRole = 'All';

function initInvigilation() {
    loadInvigChart();
}

async function loadInvigChart() {
    const tbody = document.getElementById('invigTableBody');
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px"><div class="spinner" style="margin:0 auto"></div></td></tr>`;
    document.getElementById('invigEmpty').style.display = 'none';

    try {
        const res = await apiFetch(API.staff);
        if (!res.success) { toast('error', res.message); return; }
        invigAllStaff = res.data || [];
        // Initialise chart data for any new staff
        invigAllStaff.forEach(s => {
            if (!invigChartData[s._id]) {
                invigChartData[s._id] = { shift: '', amount: 0 };
            }
        });
        invigPage = 1;
        renderInvigChart();
    } catch (err) { toast('error', 'Failed to load faculty: ' + err.message); }
}

function renderInvigChart() {
    const search = invigSearch.toLowerCase();
    const role   = invigRole;

    invigFilteredStaff = invigAllStaff.filter(s => {
        const matchSearch = !search ||
            (s.facultyName || '').toLowerCase().includes(search) ||
            (s.mobileNumber || '').includes(search);
        const matchRole = role === 'All' || s.qualification === role;
        return matchSearch && matchRole;
    });

    const tbody = document.getElementById('invigTableBody');
    const empty = document.getElementById('invigEmpty');
    const total = invigFilteredStaff.length;

    if (!total) {
        tbody.innerHTML = '';
        empty.style.display = 'block';
        document.getElementById('invigPagination').innerHTML = '';
        return;
    }
    empty.style.display = 'none';

    const start = (invigPage - 1) * invigLimit;
    const slice = invigFilteredStaff.slice(start, start + invigLimit);

    const SHIFTS = ['Morning (8AM–12PM)', 'Afternoon (12PM–4PM)', 'Evening (4PM–8PM)'];

    tbody.innerHTML = slice.map((s, i) => {
        const d = invigChartData[s._id] || { shift: '', amount: 0 };
        const shiftOpts = `<option value="">— Select Shift —</option>` +
            SHIFTS.map(sh => `<option value="${sh}" ${d.shift === sh ? 'selected' : ''}>${sh}</option>`).join('');

        return `
        <tr>
            <td style="color:var(--text-muted)">${start + i + 1}</td>
            <td><strong>${s.facultyName}</strong></td>
            <td><span class="badge badge-purple">${s.qualification || '—'}</span></td>
            <td>${s.mobileNumber || '—'}</td>
            <td style="font-size:.8rem;color:var(--text-muted)">${s.bankAccount || '—'}</td>
            <td>
                <select class="filter-select" style="padding:5px 8px;font-size:.78rem;min-width:160px"
                    onchange="invigSetShift('${s._id}', this.value)">${shiftOpts}</select>
            </td>
            <td>
                <div style="display:flex;flex-direction:column;gap:4px;min-width:140px">
                    <span style="font-weight:700;font-size:.92rem;color:var(--purple-700)" id="invig-amt-${s._id}">₹${d.amount.toLocaleString()}</span>
                    <div style="display:flex;gap:4px">
                        <input type="number" id="invig-add-${s._id}" min="0" placeholder="Add ₹"
                            style="width:80px;padding:4px 8px;border:1px solid var(--border);border-radius:6px;font-size:.78rem;outline:none"
                            onkeydown="if(event.key==='Enter'){invigAddAmount('${s._id}')}"
                        >
                        <button onclick="invigAddAmount('${s._id}')"
                            style="padding:4px 10px;background:var(--purple-600);color:#fff;border:none;border-radius:6px;font-size:.75rem;font-weight:600;cursor:pointer;white-space:nowrap">
                            Add
                        </button>
                    </div>
                </div>
            </td>
        </tr>`;
    }).join('');

    renderPagination('invigPagination', {
        total, page: invigPage, limit: invigLimit,
        totalPages: Math.ceil(total / invigLimit)
    }, (p) => { invigPage = p; renderInvigChart(); });
}

function invigSetShift(id, value) {
    if (!invigChartData[id]) invigChartData[id] = { shift: '', amount: 0 };
    invigChartData[id].shift = value;
}

function invigAddAmount(id) {
    const input = document.getElementById(`invig-add-${id}`);
    const val = parseFloat(input.value);
    if (isNaN(val) || val <= 0) {
        toast('warning', 'Enter a valid positive amount.');
        return;
    }
    if (!invigChartData[id]) invigChartData[id] = { shift: '', amount: 0 };
    invigChartData[id].amount += val;
    input.value = '';

    // Update the displayed total without full re-render
    const amtEl = document.getElementById(`invig-amt-${id}`);
    if (amtEl) amtEl.textContent = `₹${invigChartData[id].amount.toLocaleString()}`;
    toast('success', `₹${val.toLocaleString()} added successfully.`);
}

// Search & filter listeners
let invigSearchTimer;
document.getElementById('invigSearch').addEventListener('input', e => {
    clearTimeout(invigSearchTimer);
    invigSearchTimer = setTimeout(() => { invigSearch = e.target.value.trim(); invigPage = 1; renderInvigChart(); }, 300);
});
document.getElementById('invigRoleFilter').addEventListener('change', e => { invigRole = e.target.value; invigPage = 1; renderInvigChart(); });

// Print
document.getElementById('invigPrintBtn').addEventListener('click', () => { window.print(); });






// ═══════════════════════════════════════════════════════════════════
// PAGE 5: STATEMENT / INVOICE
// ═══════════════════════════════════════════════════════════════════
let currentInvoiceStaff = [];

function initInvoicePage() {
    const today = new Date().toISOString().split('T')[0];
    if (!document.getElementById('inv-exam-date').value) document.getElementById('inv-exam-date').value = today;
}

document.getElementById('genStmtBtn').addEventListener('click', generateStatement);

async function generateStatement() {
    const examDate = document.getElementById('inv-exam-date').value;
    if (!examDate) { toast('warning', 'Please select an exam date.'); return; }

    const btn = document.getElementById('genStmtBtn');
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating…';

    try {
        const res = await apiFetch(`${API.invoices}/generate?examDate=${examDate}`);
        if (!res.success) { toast('error', res.message || 'Failed to generate statement.'); return; }

        currentInvoiceStaff = res.data;
        if (!currentInvoiceStaff.length) {
            toast('warning', 'No active staff found. Register staff first.');
            return;
        }

        const defaultAmt = parseFloat(document.getElementById('inv-default-amt').value) || 1500;
        renderInvoiceTable(currentInvoiceStaff, defaultAmt, examDate);
        document.getElementById('invoiceCard').style.display = 'block';
        toast('success', `Statement generated for ${currentInvoiceStaff.length} staff.`);
    } catch (err) { toast('error', err.message || 'Generation failed.'); }
    finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate Statement'; }
}

function renderInvoiceTable(staff, defaultAmt, examDate) {
    const label = new Date(examDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    document.getElementById('invoiceDateLabel').textContent = label;

    const tbody = document.getElementById('invoiceTableBody');
    tbody.innerHTML = staff.map((s, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><strong>${s.name}</strong></td>
            <td><span class="badge badge-purple">${s.role}</span></td>
            <td>${s.phone || '—'}</td>
            <td style="font-size:.8rem">${s.bankAccount || '—'}</td>
            <td style="text-align:right">
                <input type="number" class="amount-input" id="amt-${s._id || i}"
                    value="${defaultAmt}" min="0" onchange="recalcTotal()">
            </td>
        </tr>`).join('');
    recalcTotal();
}

function recalcTotal() {
    const inputs = document.querySelectorAll('#invoiceTableBody .amount-input');
    let total = 0;
    inputs.forEach(inp => { total += parseFloat(inp.value) || 0; });
    document.getElementById('invoiceTotal').textContent = total.toLocaleString('en-IN');
}

document.getElementById('resetAmountsBtn').addEventListener('click', () => {
    const defaultAmt = parseFloat(document.getElementById('inv-default-amt').value) || 1500;
    document.querySelectorAll('#invoiceTableBody .amount-input').forEach(inp => { inp.value = defaultAmt; });
    recalcTotal();
});

document.getElementById('clearStmtBtn').addEventListener('click', () => {
    document.getElementById('invoiceCard').style.display = 'none';
    currentInvoiceStaff = [];
    document.getElementById('invoiceTableBody').innerHTML = '';
});

// ─── SAVE INVOICE ─────────────────────────────────────────────────
document.getElementById('saveInvoiceBtn').addEventListener('click', async () => {
    const examDate = document.getElementById('inv-exam-date').value;
    if (!examDate || !currentInvoiceStaff.length) {
        toast('warning', 'Generate a statement first.');
        return;
    }

    const entries = currentInvoiceStaff.map((s, i) => ({
        staffId:       s._id || null,
        name:          s.name,
        role:          s.role,
        phone:         s.phone || '',
        accountNumber: s.bankAccount || '',
        amount:        parseFloat(document.getElementById(`amt-${s._id || i}`)?.value) || 0
    }));

    const btn = document.getElementById('saveInvoiceBtn');
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…';

    try {
        const res = await apiFetch(API.invoices, {
            method: 'POST',
            body: JSON.stringify({
                examDate,
                entries,
                defaultAmount: parseFloat(document.getElementById('inv-default-amt').value) || 1500
            })
        });
        if (res.success) toast('success', 'Invoice saved successfully! View it in Registered Invoices.');
        else toast('error', res.message);
    } catch (err) { toast('error', err.message || 'Save failed.'); }
    finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Invoice'; }
});

// ─── PRINT / PDF ──────────────────────────────────────────────────
document.getElementById('printInvoiceBtn').addEventListener('click', () => {
    const examDate = document.getElementById('inv-exam-date').value;
    if (!currentInvoiceStaff.length) { toast('warning', 'No data to print.'); return; }
    generateInvoicePDF(examDate, currentInvoiceStaff);
});

function generateInvoicePDF(examDate, staff, invoiceData) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const collegeName = localStorage.getItem('cfg-college') || 'Potti Sriramulu Chalavadi Mallikarjuna Rao College of Engineering and Technology';
    const dateStr = new Date(examDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Header
    doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text(collegeName, 105, 18, { align: 'center' });
    doc.setFontSize(11);
    doc.text('STATEMENT / INVOICE', 105, 26, { align: 'center' });
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(`Exam Date: ${dateStr}`, 195, 35, { align: 'right' });

    // Table
    const entries = staff.map((s, i) => {
        const amt = parseFloat(document.getElementById(`amt-${s._id || i}`)?.value) || 0;
        return [i + 1, s.name, s.role, s.phone || '—', s.bankAccount || '—', `₹${amt.toLocaleString('en-IN')}`];
    });

    const total = entries.reduce((sum, row) => sum + parseFloat(row[5].replace(/[^0-9]/g, '') || 0), 0);

    doc.autoTable({
        head: [['S.No', 'Name', 'Role', 'Phone Number', 'Account Number', 'Amount (₹)']],
        body: entries,
        startY: 40,
        theme: 'grid',
        headStyles: { fillColor: [91, 33, 182], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8.5 },
        alternateRowStyles: { fillColor: [245, 243, 255] },
        columnStyles: { 0: { halign: 'center', cellWidth: 12 }, 5: { halign: 'right' } },
        foot: [['', '', '', '', 'Total Amount (₹)', `₹${total.toLocaleString('en-IN')}`]],
        footStyles: { fillColor: [237, 233, 254], textColor: [91, 33, 182], fontStyle: 'bold' }
    });

    // Footer
    const finalY = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(8.5);
    doc.text('Prepared By', 30, finalY + 10);
    doc.text('Authorised Signatory', 160, finalY + 10);
    doc.line(20, finalY + 8, 70, finalY + 8);
    doc.line(150, finalY + 8, 200, finalY + 8);

    doc.save(`Invoice_${examDate}.pdf`);
    toast('success', 'PDF downloaded successfully!');
}

// ═══════════════════════════════════════════════════════════════════
// PAGE 6: REGISTERED INVOICES
// ═══════════════════════════════════════════════════════════════════
let riPage = 1, riLimit = 10, riSearch = '', riDate = '';

async function initRegInvoices() { await loadRegisteredInvoices(); }

async function loadRegisteredInvoices() {
    const params = new URLSearchParams({
        page: riPage, limit: riLimit,
        search: riSearch,
        ...(riDate ? { fromDate: riDate, toDate: riDate } : {})
    });

    const tbody = document.getElementById('riTableBody');
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px"><div class="spinner" style="margin:0 auto"></div></td></tr>`;

    try {
        const res = await apiFetch(`${API.invoices}?${params}`);
        if (!res.success) { toast('error', res.message); return; }

        const { data, pagination } = res;
        document.getElementById('ri-subtitle').textContent = `${pagination.total} saved invoice(s)`;

        if (!data.length) {
            tbody.innerHTML = '';
            document.getElementById('riEmpty').style.display = 'block';
        } else {
            document.getElementById('riEmpty').style.display = 'none';
            tbody.innerHTML = data.map((inv, i) => `
                <tr>
                    <td style="color:var(--text-muted)">${(riPage - 1) * riLimit + i + 1}</td>
                    <td><strong>${inv.invoiceNumber}</strong></td>
                    <td>${fmtDate(inv.examDate)}</td>
                    <td style="text-align:center">${inv.noOfStaff}</td>
                    <td style="font-weight:600;color:var(--purple-700)">${fmtCurrency(inv.totalAmount)}</td>
                    <td style="font-size:.78rem;color:var(--text-muted)">${fmtDateTime(inv.generatedOn)}</td>
                    <td>
                        <div class="table-actions">
                            <button class="act-btn act-btn-view"     onclick="viewInvoice('${inv._id}')"     title="View">View</button>
                            <button class="act-btn act-btn-download" onclick="downloadInvoiceExcel('${inv._id}')" title="Download Excel"><i class="fa-solid fa-file-excel"></i></button>
                            <button class="act-btn act-btn-delete"   onclick="deleteInvoice('${inv._id}')"   title="Delete"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                </tr>`).join('');
        }

        renderPagination('riPagination', pagination, (p) => { riPage = p; loadRegisteredInvoices(); });
    } catch (err) { toast('error', 'Failed to load invoices: ' + err.message); }
}

let riSearchTimer;
document.getElementById('riSearch').addEventListener('input', e => {
    clearTimeout(riSearchTimer);
    riSearchTimer = setTimeout(() => { riSearch = e.target.value.trim(); riPage = 1; loadRegisteredInvoices(); }, 350);
});
document.getElementById('riDateFilter').addEventListener('change', e => {
    riDate = e.target.value; riPage = 1; loadRegisteredInvoices();
});

// ─── VIEW INVOICE ─────────────────────────────────────────────────
let currentViewInvoiceId = null;

async function viewInvoice(id) {
    currentViewInvoiceId = id;
    try {
        const res = await apiFetch(`${API.invoices}/${id}`);
        if (!res.success) return;
        const inv = res.data;

        const dateStr = new Date(inv.examDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

        document.getElementById('viewInvoiceBody').innerHTML = `
            <div style="display:flex;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
                <div><strong>Invoice No:</strong> ${inv.invoiceNumber}</div>
                <div><strong>Exam Date:</strong> ${dateStr}</div>
                <div><strong>Generated:</strong> ${fmtDateTime(inv.generatedOn)}</div>
            </div>
            <div class="table-wrap">
                <table class="data-table">
                    <thead><tr><th>#</th><th>Name</th><th>Role</th><th>Phone</th><th>Account No</th><th style="text-align:right">Amount (₹)</th></tr></thead>
                    <tbody>
                        ${inv.entries.map((e, i) => `
                            <tr>
                                <td>${i + 1}</td>
                                <td><strong>${e.name}</strong></td>
                                <td><span class="badge badge-purple">${e.role}</span></td>
                                <td>${e.phone || '—'}</td>
                                <td style="font-size:.8rem">${e.accountNumber || '—'}</td>
                                <td style="text-align:right;font-weight:600">${fmtCurrency(e.amount)}</td>
                            </tr>`).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="invoice-total-row">
                            <td colspan="5" style="text-align:right;font-weight:700">Total Amount (₹)</td>
                            <td style="text-align:right"><span class="invoice-total-amount">${fmtCurrency(inv.totalAmount)}</span></td>
                        </tr>
                    </tfoot>
                </table>
            </div>`;

        openModal('viewInvoiceModal');
    } catch (err) { toast('error', 'Failed to load invoice.'); }
}

document.getElementById('downloadInvoicePDFBtn').addEventListener('click', async () => {
    if (!currentViewInvoiceId) return;
    try {
        const res = await apiFetch(`${API.invoices}/${currentViewInvoiceId}`);
        if (!res.success) return;
        const inv = res.data;
        // Re-use the PDF generator with fixed amounts
        const staffForPDF = inv.entries.map((e, i) => ({
            _id: `view-${i}`, name: e.name, role: e.role,
            phone: e.phone, bankAccount: e.accountNumber
        }));
        // Override amount inputs temporarily
        staffForPDF.forEach((s, i) => {
            const el = document.getElementById(`amt-${s._id}`);
            if (!el) {
                const tmp = document.createElement('input');
                tmp.id = `amt-${s._id}`; tmp.type = 'number'; tmp.value = inv.entries[i].amount;
                tmp.style.display = 'none';
                document.body.appendChild(tmp);
            }
        });
        generateInvoicePDF(inv.examDate, staffForPDF, inv);
    } catch (err) { toast('error', 'PDF generation failed.'); }
});

document.getElementById('downloadInvoiceExcelBtn').addEventListener('click', async () => {
    if (!currentViewInvoiceId) return;
    await downloadInvoiceExcel(currentViewInvoiceId);
});

async function downloadInvoiceExcel(id) {
    try {
        const res = await fetch(`${API.invoices}/${id}/excel`);
        if (!res.ok) { toast('error', 'Excel download failed.'); return; }
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `Invoice_${Date.now()}.xlsx`;
        a.click(); a.remove();
        toast('success', 'Excel downloaded successfully!');
    } catch { toast('error', 'Download failed.'); }
}

// ─── DELETE INVOICE ───────────────────────────────────────────────
function deleteInvoice(id) {
    deleteTargetId = id;
    deleteTargetType = 'invoice';
    openModal('deleteModal');
}

let deleteTargetType = 'staff';
// Patch confirmDeleteBtn to handle both staff and invoice
document.getElementById('confirmDeleteBtn').removeEventListener('click', window._deleteHandler);
window._deleteHandler = async () => {
    if (!deleteTargetId) return;
    const btn = document.getElementById('confirmDeleteBtn');
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting…';
    try {
        const url = deleteTargetType === 'invoice'
            ? `${API.invoices}/${deleteTargetId}`
            : `${API.staff}/${deleteTargetId}`;
        const res = await apiFetch(url, { method: 'DELETE' });
        closeModal('deleteModal');
        if (res.success) {
            toast('success', `${deleteTargetType === 'invoice' ? 'Invoice' : 'Staff'} deleted successfully.`);
            if (deleteTargetType === 'invoice') loadRegisteredInvoices();
            else loadUserDetails();
        } else { toast('error', res.message); }
    } catch (err) { toast('error', err.message || 'Delete failed.'); }
    finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-trash"></i> Delete'; deleteTargetId = null; }
};
document.getElementById('confirmDeleteBtn').addEventListener('click', window._deleteHandler);

// ═══════════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════════
function saveSettings() {
    const college = document.getElementById('cfg-college').value.trim();
    const amount  = document.getElementById('cfg-amount').value;
    localStorage.setItem('cfg-college', college);
    localStorage.setItem('cfg-amount',  amount);
    toast('success', 'Settings saved successfully!');
}

// Load saved settings
const savedCollege = localStorage.getItem('cfg-college');
const savedAmount  = localStorage.getItem('cfg-amount');
if (savedCollege) document.getElementById('cfg-college').value = savedCollege;
if (savedAmount)  document.getElementById('cfg-amount').value  = savedAmount;

// ═══════════════════════════════════════════════════════════════════
// PAGINATION RENDERER
// ═══════════════════════════════════════════════════════════════════
function renderPagination(containerId, pagination, onPageChange) {
    const { total, page, limit, totalPages } = pagination;
    const el = document.getElementById(containerId);
    if (!el) return;

    const start = (page - 1) * limit + 1;
    const end   = Math.min(page * limit, total);

    let pagesHtml = '';
    const maxVisible = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
    let endPage   = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);

    pagesHtml += `<button class="page-btn" ${page <= 1 ? 'disabled' : ''} onclick="(${onPageChange.toString()})(${page - 1})"><i class="fa-solid fa-chevron-left" style="font-size:.65rem"></i></button>`;
    for (let p = startPage; p <= endPage; p++) {
        pagesHtml += `<button class="page-btn ${p === page ? 'active' : ''}" onclick="(${onPageChange.toString()})(${p})">${p}</button>`;
    }
    pagesHtml += `<button class="page-btn" ${page >= totalPages ? 'disabled' : ''} onclick="(${onPageChange.toString()})(${page + 1})"><i class="fa-solid fa-chevron-right" style="font-size:.65rem"></i></button>`;

    el.innerHTML = `
        <span class="pagination-info">Showing ${total ? start : 0}–${end} of ${total} records</span>
        <div class="pagination-controls">${pagesHtml}</div>`;
}

// ═══════════════════════════════════════════════════════════════════
// MOBILE RESPONSIVE DRAWER LISTENERS
// ═══════════════════════════════════════════════════════════════════
document.getElementById('menuToggleMobile').addEventListener('click', () => {
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (sidebar && backdrop) {
        sidebar.classList.toggle('mobile-open');
        backdrop.classList.toggle('show');
    }
});

document.getElementById('sidebarBackdrop').addEventListener('click', () => {
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (sidebar && backdrop) {
        sidebar.classList.remove('mobile-open');
        backdrop.classList.remove('show');
    }
});

// Auto-close sidebar drawer on nav selection on mobile
document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    item.addEventListener('click', () => {
        const sidebar = document.querySelector('.sidebar');
        const backdrop = document.getElementById('sidebarBackdrop');
        if (sidebar && backdrop && window.innerWidth <= 768) {
            sidebar.classList.remove('mobile-open');
            backdrop.classList.remove('show');
        }
    });
});

// ═══════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════
initDashboard();
