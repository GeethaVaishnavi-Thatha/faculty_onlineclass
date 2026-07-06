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
    staff:        `${BASE_URL}/api/exam-staff`,
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
    'staff-reg':    'Faculty Registration',
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
// PAGE 2: STAFF REGISTRATION
// ═══════════════════════════════════════════════════════════════════
const staffForm = document.getElementById('staffForm');

staffForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name  = document.getElementById('sf-name').value.trim();
    const role  = document.getElementById('sf-role').value;
    const dept  = document.getElementById('sf-dept').value.trim();
    const phone = document.getElementById('sf-phone').value.trim();
    const email = document.getElementById('sf-email').value.trim();
    const bank  = document.getElementById('sf-bank').value.trim();
    const ifsc  = document.getElementById('sf-ifsc').value.trim().toUpperCase();

    let ok = true;
    ok = validateField('sf-name',  'sf-name-err',  name.length >= 3,                          'Name must be at least 3 characters.') && ok;
    ok = validateField('sf-role',  'sf-role-err',  role !== '',                                'Please select a role.')               && ok;
    ok = validateField('sf-dept',  'sf-dept-err',  dept.length > 0,                           'Department is required.')             && ok;
    ok = validateField('sf-phone', 'sf-phone-err', /^[6-9]\d{9}$/.test(phone),                'Enter a valid 10-digit phone number.') && ok;
    ok = validateField('sf-email', 'sf-email-err', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),  'Enter a valid email address.')        && ok;
    ok = validateField('sf-bank',  'sf-bank-err',  bank.length > 0,                           'Account number is required.')         && ok;
    ok = validateField('sf-ifsc',  'sf-ifsc-err',  /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc),     'Enter a valid IFSC code.')             && ok;

    if (!ok) return;

    const btn = document.getElementById('staffSubmitBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting…';

    try {
        const payload = {
            name, role, department: dept, phone, email,
            dateOfBirth: document.getElementById('sf-dob').value || null,
            address:     document.getElementById('sf-address').value.trim() || null,
            bankAccount: bank,
            ifscCode:    ifsc,
            experience:  parseInt(document.getElementById('sf-exp').value) || 0
        };

        const res = await apiFetch(API.staff, { method: 'POST', body: JSON.stringify(payload) });
        if (res.success) {
            toast('success', 'Staff registered successfully!');
            staffForm.reset();
            document.querySelectorAll('#staffForm .form-control').forEach(el => el.classList.remove('is-valid', 'is-invalid'));
        } else {
            toast('error', res.message || 'Registration failed.');
        }
    } catch (err) {
        toast('error', err.message || 'Network error. Please try again.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Registration';
    }
});

document.getElementById('staffResetBtn').addEventListener('click', () => {
    staffForm.reset();
    document.querySelectorAll('#staffForm .form-control').forEach(el => el.classList.remove('is-valid', 'is-invalid'));
    document.querySelectorAll('#staffForm .form-error').forEach(el => el.classList.remove('show'));
});

// Auto-format IFSC to uppercase
document.getElementById('sf-ifsc').addEventListener('input', e => {
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
});
document.getElementById('sf-phone').addEventListener('input', e => {
    e.target.value = e.target.value.replace(/\D/g, '');
});

// ═══════════════════════════════════════════════════════════════════
// PAGE 3: USER DETAILS
// ═══════════════════════════════════════════════════════════════════
let udPage = 1, udLimit = 10, udSort = 'registrationDate', udOrder = 'desc', udSearch = '', udRole = 'All', udStatus = 'All';

async function initUserDetails() { await loadUserDetails(); }

async function loadUserDetails() {
    const params = new URLSearchParams({
        page: udPage, limit: udLimit,
        sort: udSort, order: udOrder,
        search: udSearch,
        role:   udRole   !== 'All' ? udRole   : '',
        status: udStatus !== 'All' ? udStatus : ''
    });

    const tbody = document.getElementById('udTableBody');
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px"><div class="spinner" style="margin:0 auto"></div></td></tr>`;

    try {
        const res = await apiFetch(`${API.staff}?${params}`);
        if (!res.success) { toast('error', res.message); return; }

        const { data, pagination } = res;
        document.getElementById('ud-subtitle').textContent = `${pagination.total} registered staff member(s)`;

        if (!data.length) {
            tbody.innerHTML = '';
            document.getElementById('udEmpty').style.display = 'block';
        } else {
            document.getElementById('udEmpty').style.display = 'none';
            tbody.innerHTML = data.map((s, i) => `
                <tr>
                    <td style="color:var(--text-muted)">${(udPage - 1) * udLimit + i + 1}</td>
                    <td><strong>${s.name}</strong></td>
                    <td><span class="badge badge-purple">${s.role}</span></td>
                    <td>${s.phone}</td>
                    <td style="color:var(--text-secondary);font-size:.8rem">${s.email}</td>
                    <td style="font-size:.8rem;color:var(--text-muted)">${s.bankAccount}</td>
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

        renderPagination('udPagination', pagination, (p) => { udPage = p; loadUserDetails(); });
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
        const res = await fetch(`${API.staff}/export/excel`);
        if (!res.ok) { toast('error', 'Excel export failed.'); return; }
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `Exam_Staff_${Date.now()}.xlsx`;
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
                <div class="detail-item"><label>Name</label><span>${d.name}</span></div>
                <div class="detail-item"><label>Role</label><span><span class="badge badge-purple">${d.role}</span></span></div>
                <div class="detail-item"><label>Department</label><span>${d.department || '—'}</span></div>
                <div class="detail-item"><label>Phone</label><span>${d.phone}</span></div>
                <div class="detail-item"><label>Email</label><span>${d.email}</span></div>
                <div class="detail-item"><label>Date of Birth</label><span>${d.dateOfBirth ? fmtDate(d.dateOfBirth) : '—'}</span></div>
                <div class="detail-item"><label>Address</label><span>${d.address || '—'}</span></div>
                <div class="detail-item"><label>Bank Account</label><span>${d.bankAccount}</span></div>
                <div class="detail-item"><label>IFSC Code</label><span>${d.ifscCode}</span></div>
                <div class="detail-item"><label>Experience</label><span>${d.experience || 0} years</span></div>
                <div class="detail-item"><label>Status</label><span><span class="badge ${d.status === 'Active' ? 'badge-green' : 'badge-red'}">${d.status}</span></span></div>
                <div class="detail-item"><label>Availability</label><span>${d.availability}</span></div>
                <div class="detail-item"><label>Staff ID</label><span style="font-size:.78rem;color:var(--text-muted)">${d.staffId}</span></div>
                <div class="detail-item"><label>Registered On</label><span>${fmtDateTime(d.registrationDate)}</span></div>
            </div>`;
        openModal('viewStaffModal');
    } catch (err) { toast('error', 'Failed to load details.'); }
}

// ─── EDIT STAFF ───────────────────────────────────────────────────
async function editStaff(id) {
    try {
        const res = await apiFetch(`${API.staff}/${id}`);
        if (!res.success) return;
        const d = res.data;

        document.getElementById('edit-staff-id').value = id;
        document.getElementById('e-name').value    = d.name;
        document.getElementById('e-role').value    = d.role;
        document.getElementById('e-dept').value    = d.department || '';
        document.getElementById('e-phone').value   = d.phone;
        document.getElementById('e-email').value   = d.email;
        document.getElementById('e-dob').value     = d.dateOfBirth ? d.dateOfBirth.split('T')[0] : '';
        document.getElementById('e-address').value = d.address || '';
        document.getElementById('e-bank').value    = d.bankAccount;
        document.getElementById('e-ifsc').value    = d.ifscCode;
        document.getElementById('e-exp').value     = d.experience || 0;
        document.getElementById('e-status').value  = d.status;
        document.getElementById('e-avail').value   = d.availability;

        document.querySelectorAll('#editStaffModal .form-control').forEach(el => el.classList.remove('is-valid', 'is-invalid'));
        document.querySelectorAll('#editStaffModal .form-error').forEach(el => el.classList.remove('show'));

        openModal('editStaffModal');
    } catch (err) { toast('error', 'Failed to load staff for editing.'); }
}

document.getElementById('saveEditBtn').addEventListener('click', async () => {
    const id    = document.getElementById('edit-staff-id').value;
    const name  = document.getElementById('e-name').value.trim();
    const dept  = document.getElementById('e-dept').value.trim();
    const phone = document.getElementById('e-phone').value.trim();
    const email = document.getElementById('e-email').value.trim();
    const bank  = document.getElementById('e-bank').value.trim();
    const ifsc  = document.getElementById('e-ifsc').value.trim().toUpperCase();

    let ok = true;
    ok = validateField('e-name',  'e-name-err',  name.length >= 3,                            'Required.')                       && ok;
    ok = validateField('e-dept',  'e-dept-err',  dept.length > 0,                             'Required.')                       && ok;
    ok = validateField('e-phone', 'e-phone-err', /^[6-9]\d{9}$/.test(phone),                  'Valid 10-digit number required.')  && ok;
    ok = validateField('e-email', 'e-email-err', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),    'Valid email required.')            && ok;
    ok = validateField('e-bank',  'e-bank-err',  bank.length > 0,                             'Required.')                       && ok;
    ok = validateField('e-ifsc',  'e-ifsc-err',  /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc),       'Valid IFSC required.')             && ok;
    if (!ok) return;

    const btn = document.getElementById('saveEditBtn');
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…';

    try {
        const payload = {
            name, role: document.getElementById('e-role').value,
            department: dept, phone, email,
            dateOfBirth: document.getElementById('e-dob').value || null,
            address:     document.getElementById('e-address').value.trim() || null,
            bankAccount: bank, ifscCode: ifsc,
            experience:  parseInt(document.getElementById('e-exp').value) || 0,
            status:      document.getElementById('e-status').value,
            availability: document.getElementById('e-avail').value
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
let invigAllStaff       = [];  // all loaded staff (from API)
let invigAllocations    = {};  // staffId -> { hall, shift }
let invigFilteredStaff  = [];  // after search/filter
let invigPage = 1, invigLimit = 10;

function initInvigilation() {
    // Set today as default date
    const today = new Date().toISOString().split('T')[0];
    if (!document.getElementById('inv-date').value) document.getElementById('inv-date').value = today;
    updateInvigSummary();
}

// Load staff for allocation
document.getElementById('invigLoadBtn').addEventListener('click', loadInvigStaff);

async function loadInvigStaff() {
    const role = document.getElementById('inv-role-filter').value;
    const dept = document.getElementById('inv-dept').value.trim();

    const params = new URLSearchParams({ status: 'Active' });
    if (role && role !== 'All') params.append('role', role);
    if (dept)                   params.append('department', dept);

    document.getElementById('invigEmpty').style.display = 'none';
    document.getElementById('invigTableBody').innerHTML = `<tr><td colspan="9" style="text-align:center;padding:30px"><div class="spinner" style="margin:0 auto"></div></td></tr>`;

    try {
        const res = await apiFetch(`${API.invigilation}/staff?${params}`);
        if (!res.success) { toast('error', res.message); return; }

        invigAllStaff = res.data;
        invigAllocations = {};
        invigFilteredStaff = [...invigAllStaff];
        invigPage = 1;
        renderInvigTable();
        updateInvigSummary();
        toast('info', `Loaded ${invigAllStaff.length} staff member(s).`);
    } catch (err) { toast('error', 'Failed to load staff: ' + err.message); }
}

function renderInvigTable() {
    const search     = document.getElementById('invigSearch').value.toLowerCase();
    const statusFlt  = document.getElementById('invigStatusFilter').value;

    invigFilteredStaff = invigAllStaff.filter(s => {
        const alloc  = invigAllocations[s.staffId];
        const status = alloc ? (alloc.conflict ? 'Conflict' : 'Assigned') : s.availability;

        const matchSearch = !search ||
            s.name.toLowerCase().includes(search) ||
            s.role.toLowerCase().includes(search) ||
            (s.department || '').toLowerCase().includes(search);

        const matchStatus = statusFlt === 'All' || status === statusFlt;
        return matchSearch && matchStatus;
    });

    const tbody = document.getElementById('invigTableBody');
    const empty = document.getElementById('invigEmpty');
    const total = invigFilteredStaff.length;
    const start = (invigPage - 1) * invigLimit;
    const slice = invigFilteredStaff.slice(start, start + invigLimit);

    if (!total) {
        tbody.innerHTML = ''; empty.style.display = 'block'; return;
    }
    empty.style.display = 'none';

    tbody.innerHTML = slice.map((s, i) => {
        const alloc = invigAllocations[s.staffId];
        const status = alloc ? (alloc.conflict ? 'Conflict' : 'Assigned') : s.availability;

        const badgeClass = {
            Available:   'invig-badge-available',
            Assigned:    'invig-badge-assigned',
            Unavailable: 'invig-badge-unavail',
            Conflict:    'invig-badge-conflict',
            'On Leave':  'invig-badge-onleave'
        }[status] || 'invig-badge-unavail';

        const rowClass = {
            Assigned:  'invig-row-assigned',
            Conflict:  'invig-row-conflict',
            Unavailable: 'invig-row-unavail'
        }[status] || '';

        const hallSel  = generateHallSelect(s.staffId, alloc ? alloc.hall  : '');
        const shiftSel = generateShiftSelect(s.staffId, alloc ? alloc.shift : '');

        return `
        <tr class="${rowClass}">
            <td style="color:var(--text-muted)">${start + i + 1}</td>
            <td><strong>${s.name}</strong></td>
            <td>${s.department || '—'}</td>
            <td><span class="badge badge-purple">${s.role}</span></td>
            <td>${s.experience || 0} yr</td>
            <td><span class="${badgeClass}">${s.availability}</span></td>
            <td>${hallSel}</td>
            <td>${shiftSel}</td>
            <td><span class="${badgeClass}">${status}</span></td>
        </tr>`;
    }).join('');

    renderPagination('invigPagination', {
        total, page: invigPage, limit: invigLimit,
        totalPages: Math.ceil(total / invigLimit)
    }, (p) => { invigPage = p; renderInvigTable(); });
}

function generateHallSelect(staffId, currentVal) {
    const hallStr = document.getElementById('inv-halls').value;
    const halls = hallStr ? hallStr.split(',').map(h => h.trim()).filter(Boolean) : [];
    if (!halls.length) return currentVal || '—';

    const opts = `<option value="">— Select Hall —</option>` +
        halls.map(h => `<option value="${h}" ${currentVal === h ? 'selected' : ''}>${h}</option>`).join('');
    return `<select class="filter-select" style="padding:4px 8px;font-size:.78rem" 
                onchange="updateAllocation('${staffId}','hall',this.value)">${opts}</select>`;
}

function generateShiftSelect(staffId, currentVal) {
    const shifts = ['Shift 1 (9AM–12PM)', 'Shift 2 (12PM–3PM)', 'Shift 3 (3PM–6PM)'];
    const opts = `<option value="">— Select Shift —</option>` +
        shifts.map(sh => `<option value="${sh}" ${currentVal === sh ? 'selected' : ''}>${sh}</option>`).join('');
    return `<select class="filter-select" style="padding:4px 8px;font-size:.78rem"
                onchange="updateAllocation('${staffId}','shift',this.value)">${opts}</select>`;
}

function updateAllocation(staffId, field, value) {
    if (!invigAllocations[staffId]) invigAllocations[staffId] = {};
    invigAllocations[staffId][field] = value;

    // Conflict detection: same hall + same shift assigned to multiple staff
    const seen = {};
    Object.entries(invigAllocations).forEach(([sid, alloc]) => {
        if (alloc.hall && alloc.shift) {
            const key = `${alloc.hall}||${alloc.shift}`;
            if (seen[key] && seen[key] !== sid) {
                invigAllocations[sid].conflict   = true;
                invigAllocations[seen[key]].conflict = true;
            } else {
                seen[key] = sid;
                if (invigAllocations[sid]) invigAllocations[sid].conflict = false;
            }
        }
    });

    updateInvigSummary();
    renderInvigTable();
}

function updateInvigSummary() {
    const total     = invigAllStaff.length;
    const assigned  = Object.values(invigAllocations).filter(a => a.hall || a.shift).length;
    const conflicts = Object.values(invigAllocations).filter(a => a.conflict).length;
    const avail     = invigAllStaff.filter(s => s.availability === 'Available').length;
    const remaining = total - assigned;

    document.getElementById('inv-total').textContent     = total;
    document.getElementById('inv-assigned').textContent  = assigned;
    document.getElementById('inv-available').textContent = avail;
    document.getElementById('inv-conflicts').textContent = conflicts;
    document.getElementById('inv-remaining').textContent = remaining;
}

// Search/filter
document.getElementById('invigSearch').addEventListener('input', () => { invigPage = 1; renderInvigTable(); });
document.getElementById('invigStatusFilter').addEventListener('change', () => { invigPage = 1; renderInvigTable(); });

// ─── AUTO ALLOCATE ────────────────────────────────────────────────
document.getElementById('invigAutoBtn').addEventListener('click', async () => {
    if (!invigAllStaff.length) {
        toast('warning', 'Please load staff first using the Load Staff button.');
        return;
    }
    const hallStr = document.getElementById('inv-halls').value;
    const halls   = hallStr ? hallStr.split(',').map(h => h.trim()).filter(Boolean) : [];
    if (!halls.length) {
        toast('warning', 'Please enter at least one hall in the Halls field.');
        return;
    }

    const btn = document.getElementById('invigAutoBtn');
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Allocating…';

    try {
        const payload = {
            halls,
            shifts:      ['Shift 1 (9AM–12PM)', 'Shift 2 (12PM–3PM)', 'Shift 3 (3PM–6PM)'],
            role:        document.getElementById('inv-role-filter').value,
            department:  document.getElementById('inv-dept').value.trim(),
            building:    document.getElementById('inv-building').value.trim(),
            floor:       document.getElementById('inv-floor').value.trim(),
            staffPerHall: parseInt(document.getElementById('inv-per-hall').value) || 2
        };
        const res = await apiFetch(`${API.invigilation}/auto-allocate`, { method: 'POST', body: JSON.stringify(payload) });

        if (res.success) {
            // Apply allocations to local state
            invigAllocations = {};
            res.allocations.forEach(a => {
                invigAllocations[a.staffId] = { hall: a.hall, shift: a.shift, conflict: false };
            });
            renderInvigTable();
            updateInvigSummary();
            toast('success', res.message);
        } else {
            toast('warning', res.message);
        }
    } catch (err) { toast('error', err.message || 'Auto-allocation failed.'); }
    finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Auto Allocate'; }
});

// ─── CLEAR ALLOCATION ─────────────────────────────────────────────
document.getElementById('invigClearBtn').addEventListener('click', () => {
    invigAllocations = {};
    renderInvigTable();
    updateInvigSummary();
    toast('info', 'Allocations cleared.');
});

// ─── SAVE CHART ───────────────────────────────────────────────────
document.getElementById('invigSaveBtn').addEventListener('click', async () => {
    const examDate = document.getElementById('inv-date').value;
    if (!examDate) { toast('warning', 'Please select an exam date.'); return; }

    const allocations = invigAllStaff
        .filter(s => invigAllocations[s.staffId] && (invigAllocations[s.staffId].hall || invigAllocations[s.staffId].shift))
        .map(s => ({
            staffId:    s.staffId,
            name:       s.name,
            role:       s.role,
            department: s.department || '',
            hall:       invigAllocations[s.staffId].hall  || '',
            shift:      invigAllocations[s.staffId].shift || '',
            building:   document.getElementById('inv-building').value.trim(),
            floor:      document.getElementById('inv-floor').value.trim(),
            status:     invigAllocations[s.staffId].conflict ? 'Conflict' : 'Assigned'
        }));

    if (!allocations.length) { toast('warning', 'No allocations to save.'); return; }

    const btn = document.getElementById('invigSaveBtn');
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…';

    try {
        const payload = {
            examDate,
            department: document.getElementById('inv-dept').value.trim(),
            building:   document.getElementById('inv-building').value.trim(),
            floor:      document.getElementById('inv-floor').value.trim(),
            allocations
        };
        const res = await apiFetch(API.invigilation, { method: 'POST', body: JSON.stringify(payload) });
        if (res.success) toast('success', res.message);
        else toast('error', res.message);
    } catch (err) { toast('error', err.message || 'Save failed.'); }
    finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Chart'; }
});

// ─── EXPORT CHART EXCEL ───────────────────────────────────────────
document.getElementById('invigExcelBtn').addEventListener('click', () => {
    if (!invigAllStaff.length) { toast('warning', 'No data to export.'); return; }
    toast('info', 'Preparing Excel…');
    // Build data for client-side export via jsPDF autotable or send to server
    const allocations = invigAllStaff.filter(s => invigAllocations[s.staffId]);
    if (!allocations.length) { toast('warning', 'No allocations to export.'); return; }
    // Trigger server download if we have a saved chart; otherwise show message
    toast('info', 'Please save the chart first, then download from Registered Charts.');
});

// ─── PRINT CHART ──────────────────────────────────────────────────
document.getElementById('invigPrintBtn').addEventListener('click', () => {
    window.print();
});

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

    const collegeName = localStorage.getItem('cfg-college') || 'Sri Venkateswara College (Autonomous)';
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
// INIT
// ═══════════════════════════════════════════════════════════════════
initDashboard();
