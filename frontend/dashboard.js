const API = "http://localhost:8000/api/faculty";

// --- Auth Guard ---
if (sessionStorage.getItem("adminAuth") !== "true") {
    window.location.href = "login.html";
}
document.getElementById("adminName").textContent = sessionStorage.getItem("adminUser") || "admin";

function logout() {
    sessionStorage.clear();
    window.location.href = "login.html";
}

// --- Toast ---
function toast(type, msg) {
    const t = document.getElementById("toast");
    const isOk = type === "success";
    t.style.background = isOk ? "rgba(16,185,129,.95)" : "rgba(239,68,68,.95)";
    t.style.color = "#fff";
    t.innerHTML = `<i class="fa-solid ${isOk ? "fa-circle-check" : "fa-circle-exclamation"} me-2"></i>${msg}`;
    t.style.display = "block";
    setTimeout(() => { t.style.display = "none"; }, 4500);
}

// --- Fetch & Render ---
async function fetchRecords(search = "") {
    try {
        const url = search ? `${API}?search=${encodeURIComponent(search)}` : API;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success) renderTable(data.data);
    } catch { toast("error", "Could not connect to server."); }
}

function renderTable(data) {
    const body = document.getElementById("tableBody");
    const empty = document.getElementById("emptyState");
    document.getElementById("statTotal").textContent = data.length;
    body.innerHTML = "";
    if (!data.length) { empty.classList.remove("d-none"); return; }
    empty.classList.add("d-none");
    data.forEach((f, i) => {
        const photoSrc = f.passportPhoto
            ? `http://localhost:8000/uploads/${f.passportPhoto}`
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(f.facultyName)}&background=6366f1&color=fff&size=80`;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="color:#64748b;font-size:.82rem">${i + 1}</td>
            <td><img src="${photoSrc}" class="avatar-sm" alt="photo" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(f.facultyName)}&background=6366f1&color=fff&size=80'"></td>
            <td style="font-weight:600">${f.facultyName}</td>
            <td style="color:#94a3b8">${f.mobileNumber}</td>
            <td style="color:#94a3b8;font-size:.83rem">${f.collegeEmail || "—"}</td>
            <td><span class="qual-badge">${f.qualification}</span></td>
            <td style="text-align:center">
                <div class="d-flex gap-1 justify-content-center">
                    <button class="btn-act btn-view" title="View" onclick="openView('${f._id}')"><i class="fa-solid fa-eye"></i></button>
                    <button class="btn-act btn-edit" title="Edit" onclick="openEdit('${f._id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-act btn-del" title="Delete" onclick="openDelete('${f._id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>`;
        body.appendChild(tr);
    });
}

// --- Search ---
document.getElementById("searchInput").addEventListener("input", e => fetchRecords(e.target.value.trim()));

// --- Excel ---
document.getElementById("excelBtn").addEventListener("click", async () => {
    const btn = document.getElementById("excelBtn");
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin me-1"></i>Generating...`;
    try {
        const res = await fetch(`${API}/download/excel`);
        if (!res.ok) { toast("error", "Failed to generate Excel."); return; }
        const blob = await res.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `Faculty_Records_${Date.now()}.xlsx`;
        a.click();
        a.remove();
        toast("success", "Excel downloaded successfully!");
    } catch { toast("error", "Download failed. Check server connection."); }
    finally { btn.disabled = false; btn.innerHTML = `<i class="fa-solid fa-file-excel me-1"></i>Download Excel`; }
});

// --- VIEW MODAL ---
async function openView(id) {
    try {
        const res = await fetch(`${API}/${id}`);
        const result = await res.json();
        if (!result.success) return;
        const d = result.data;
        const photoSrc = d.passportPhoto
            ? `http://localhost:8000/uploads/${d.passportPhoto}`
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(d.facultyName)}&background=6366f1&color=fff&size=80`;

        const rows = [
            ["Reg ID", `<span style="color:#818cf8;font-weight:600">${d.regId}</span>`],
            ["Faculty Name", d.facultyName],
            ["Mobile Number", d.mobileNumber],
            ["Alternate Mobile", d.alternateMobile || "N/A"],
            ["College Email", d.collegeEmail],
            ["Personal Email", d.personalEmail],
            ["Bank Name", d.bankName],
            ["Bank Account", d.bankAccount],
            ["IFSC Code", d.ifscCode],
            ["Father's Name", d.fatherName],
            ["Mother's Name", d.motherName],
            ["Qualification", d.qualification],
            ["TCS Code", d.tcsCode || "N/A"],
            ["Aadhaar Number", d.aadhaarNumber.slice(0,4)+"XXXX"+d.aadhaarNumber.slice(-4)],
            ["PAN Number", d.panNumber || "N/A"],
            ["Registered On", new Date(d.registrationDate).toLocaleString("en-IN")]
        ];

        const rowsHtml = rows.map(([k,v]) => `<div class="detail-row"><span class="detail-key">${k}</span><span class="detail-val">${v}</span></div>`).join("");

        const links = [
            d.aadhaarFile ? `<a href="http://localhost:8000/uploads/${d.aadhaarFile}" target="_blank" style="color:#818cf8;font-size:.82rem"><i class="fa-solid fa-file-pdf me-1"></i>Aadhaar Doc</a>` : "",
            d.panFile ? `<a href="http://localhost:8000/uploads/${d.panFile}" target="_blank" style="color:#818cf8;font-size:.82rem"><i class="fa-solid fa-file-pdf me-1"></i>PAN Doc</a>` : ""
        ].filter(Boolean).join(`<span style="color:#334155;margin:0 8px">|</span>`);

        document.getElementById("viewBody").innerHTML = `
            <div class="d-flex align-items-center gap-4 mb-3 pb-3" style="border-bottom:1px solid rgba(255,255,255,.07)">
                <img src="${photoSrc}" class="photo-circle" alt="photo" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(d.facultyName)}&background=6366f1&color=fff&size=80'">
                <div><div style="font-size:1.2rem;font-weight:700">${d.facultyName}</div><div style="color:#94a3b8;font-size:.85rem">${d.qualification} · ${d.mobileNumber}</div></div>
            </div>
            ${rowsHtml}
            ${links ? `<div class="mt-3 d-flex gap-3">${links}</div>` : ""}
        `;
        new bootstrap.Modal(document.getElementById("viewModal")).show();
    } catch { toast("error", "Failed to load faculty details."); }
}

// --- EDIT MODAL ---
let currentEditId = null;

async function openEdit(id) {
    try {
        const res = await fetch(`${API}/${id}`);
        const result = await res.json();
        if (!result.success) return;
        const d = result.data;
        currentEditId = id;

        document.getElementById("editId").value = id;
        document.getElementById("eFacultyName").value = d.facultyName;
        document.getElementById("eMobile").value = d.mobileNumber;
        document.getElementById("eAltMobile").value = d.alternateMobile || "";
        document.getElementById("eCollegeEmail").value = d.collegeEmail;
        document.getElementById("ePersonalEmail").value = d.personalEmail;
        document.getElementById("eFatherName").value = d.fatherName;
        document.getElementById("eMotherName").value = d.motherName;
        document.getElementById("eQualification").value = d.qualification;
        document.getElementById("eTcsCode").value = d.tcsCode || "";
        document.getElementById("eAadhaar").value = d.aadhaarNumber;
        document.getElementById("ePan").value = d.panNumber || "";
        document.getElementById("eBankName").value = d.bankName;
        document.getElementById("eIfsc").value = d.ifscCode;
        document.getElementById("eBankAcc").value = d.bankAccount;
        document.getElementById("eBankAccConfirm").value = d.bankAccount;

        // Clear file inputs & validation classes
        ["eAadhaarFile","ePanFile","ePhoto"].forEach(id => { const el=document.getElementById(id); if(el) el.value=""; });
        document.querySelectorAll("#editModal .e-input").forEach(el => el.classList.remove("is-valid","is-invalid"));
        document.querySelectorAll("#editModal .e-err").forEach(el => el.style.display="none");

        new bootstrap.Modal(document.getElementById("editModal")).show();
    } catch { toast("error", "Failed to load faculty for editing."); }
}

// IFSC auto-uppercase
document.getElementById("eIfsc").addEventListener("input", e => e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,""));
document.getElementById("ePan").addEventListener("input", e => e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,""));
document.getElementById("eMobile").addEventListener("input", e => e.target.value = e.target.value.replace(/\D/g,""));
document.getElementById("eAltMobile").addEventListener("input", e => e.target.value = e.target.value.replace(/\D/g,""));
document.getElementById("eAadhaar").addEventListener("input", e => e.target.value = e.target.value.replace(/\D/g,""));

document.getElementById("saveEditBtn").addEventListener("click", async () => {
    // Basic validation
    const fname = document.getElementById("eFacultyName").value.trim();
    const mobile = document.getElementById("eMobile").value.trim();
    const cEmail = document.getElementById("eCollegeEmail").value.trim();
    const pEmail = document.getElementById("ePersonalEmail").value.trim();
    const father = document.getElementById("eFatherName").value.trim();
    const mother = document.getElementById("eMotherName").value.trim();
    const qual = document.getElementById("eQualification").value;
    const aadhaar = document.getElementById("eAadhaar").value.trim();
    const bankName = document.getElementById("eBankName").value.trim();
    const ifsc = document.getElementById("eIfsc").value.trim();
    const bankAcc = document.getElementById("eBankAcc").value.trim();
    const bankAccConfirm = document.getElementById("eBankAccConfirm").value.trim();
    const pan = document.getElementById("ePan").value.trim();
    const altMobile = document.getElementById("eAltMobile").value.trim();

    let ok = true;
    const check = (id, errId, cond, msg) => {
        const el = document.getElementById(id);
        const err = document.getElementById(errId);
        if (!cond) { el.classList.add("is-invalid"); el.classList.remove("is-valid"); if(err){err.style.display="block";err.textContent=msg;} ok=false; }
        else { el.classList.remove("is-invalid"); el.classList.add("is-valid"); if(err) err.style.display="none"; }
    };

    check("eFacultyName","eFacultyNameErr", /^[A-Za-z\s]{3,}$/.test(fname), "Min 3 alphabets required.");
    check("eMobile","eMobileErr", /^[6-9]\d{9}$/.test(mobile), "Valid 10-digit number required.");
    check("eCollegeEmail","eCollegeEmailErr", /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cEmail), "Valid email required.");
    check("ePersonalEmail","ePersonalEmailErr", /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pEmail), "Valid email required.");
    check("eFatherName","eFatherNameErr", /^[A-Za-z\s]+$/.test(father), "Only alphabets allowed.");
    check("eMotherName","eMotherNameErr", /^[A-Za-z\s]+$/.test(mother), "Only alphabets allowed.");
    check("eAadhaar","eAadhaarErr", /^\d{12}$/.test(aadhaar), "Exactly 12 digits required.");
    check("eBankName","eBankNameErr", bankName.length > 0, "Bank name required.");
    check("eIfsc","eIfscErr", /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc), "Valid IFSC code required.");
    check("eBankAcc","eBankAccErr", bankAcc.length > 0, "Account number required.");
    check("eBankAccConfirm","eBankAccConfirmErr", bankAcc === bankAccConfirm && bankAccConfirm.length > 0, "Account numbers do not match.");
    if (altMobile && !/^[6-9]\d{9}$/.test(altMobile)) { document.getElementById("eAltMobile").classList.add("is-invalid"); ok=false; }
    if (pan && !/^[A-Z]{5}\d{4}[A-Z]{1}$/.test(pan)) { document.getElementById("ePan").classList.add("is-invalid"); ok=false; }
    if (!qual) { document.getElementById("eQualification").classList.add("is-invalid"); ok=false; }

    if (!ok) return;

    const btn = document.getElementById("saveEditBtn");
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin me-2"></i>Saving...`;

    const formData = new FormData();
    formData.append("facultyName", fname);
    formData.append("mobileNumber", mobile);
    formData.append("alternateMobile", altMobile);
    formData.append("collegeEmail", cEmail);
    formData.append("personalEmail", pEmail);
    formData.append("fatherName", father);
    formData.append("motherName", mother);
    formData.append("qualification", qual);
    formData.append("tcsCode", document.getElementById("eTcsCode").value.trim());
    formData.append("aadhaarNumber", aadhaar);
    formData.append("panNumber", pan);
    formData.append("bankName", bankName);
    formData.append("ifscCode", ifsc);
    formData.append("bankAccount", bankAcc);

    const af = document.getElementById("eAadhaarFile").files[0];
    const pf = document.getElementById("ePanFile").files[0];
    const ph = document.getElementById("ePhoto").files[0];
    if (af) formData.append("aadhaarFile", af);
    if (pf) formData.append("panFile", pf);
    if (ph) formData.append("passportPhoto", ph);

    try {
        const res = await fetch(`${API}/${currentEditId}`, { method: "PUT", body: formData });
        const result = await res.json();
        if (result.success) {
            bootstrap.Modal.getInstance(document.getElementById("editModal")).hide();
            toast("success", "Faculty record updated successfully!");
            fetchRecords();
        } else {
            toast("error", result.message || "Update failed.");
        }
    } catch { toast("error", "Network error. Please try again."); }
    finally { btn.disabled=false; btn.innerHTML=`<i class="fa-solid fa-floppy-disk me-2"></i>Save Changes`; }
});

// --- DELETE ---
let deleteId = null;
function openDelete(id) {
    deleteId = id;
    new bootstrap.Modal(document.getElementById("delModal")).show();
}
document.getElementById("confirmDelBtn").addEventListener("click", async () => {
    if (!deleteId) return;
    try {
        const res = await fetch(`${API}/${deleteId}`, { method: "DELETE" });
        const result = await res.json();
        bootstrap.Modal.getInstance(document.getElementById("delModal")).hide();
        if (result.success) { toast("success", "Faculty deleted successfully."); fetchRecords(); }
        else toast("error", result.message);
    } catch { toast("error", "Delete failed."); }
    deleteId = null;
});

// --- Init ---
fetchRecords();
