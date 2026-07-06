document.addEventListener("DOMContentLoaded", () => {
    const IS_LOCAL = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const API = IS_LOCAL
        ? 'http://localhost:8000/api/faculty'
        : 'https://faculty-onlineclass.onrender.com/api/faculty';

    const $ = id => document.getElementById(id);
    const form = $("registrationForm");
    const submitBtn = $("submitBtn");
    const resetBtn = $("resetBtn");
    const spinner = $("loadingSpinner");
    const submitIcon = $("submitIcon");

    // --- Passport photo preview ---
    $("passportPhoto").addEventListener("change", e => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = ev => $("photoPreview").src = ev.target.result;
            reader.readAsDataURL(file);
        }
    });

    // --- Input formatters ---
    $("mobileNumber").addEventListener("input", e => { e.target.value = e.target.value.replace(/\D/g,""); validate("mobileNumber"); });
    $("alternateMobile").addEventListener("input", e => {
        e.target.value = e.target.value.replace(/\D/g,"");
        if (e.target.value) validate("alternateMobile"); else clearState("alternateMobile");
        toggleSubmit();
    });
    $("aadhaarNumber").addEventListener("input", e => { e.target.value = e.target.value.replace(/\D/g,""); validate("aadhaarNumber"); });
    $("panNumber").addEventListener("input", e => {
        e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"");
        if (e.target.value) validate("panNumber"); else clearState("panNumber");
        toggleSubmit();
    });
    $("ifscCode").addEventListener("input", e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,""); validate("ifscCode"); });
    $("bankAccount").addEventListener("input", () => { validateBankAcc(); if ($("bankAccountConfirm").value) validateBankConfirm(); });
    $("bankAccountConfirm").addEventListener("input", validateBankConfirm);
    ["facultyName","fatherName","motherName","bankName","collegeEmail","personalEmail"].forEach(id =>
        $(id).addEventListener("input", () => validate(id)));
    $("qualification").addEventListener("change", () => validate("qualification"));
    $("aadhaarFile").addEventListener("change", () => validateFile("aadhaarFile"));

    // --- Validation rules ---
    const rules = {
        facultyName: { pattern: /^[A-Za-z\s]{3,}$/, err: "facultyNameErr" },
        mobileNumber: { pattern: /^[6-9]\d{9}$/, err: "mobileErr" },
        alternateMobile: { pattern: /^[6-9]\d{9}$/, err: "altMobileErr" },
        collegeEmail: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, err: "collegeEmailErr" },
        personalEmail: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, err: "personalEmailErr" },
        fatherName: { pattern: /^[A-Za-z\s]+$/, err: "fatherErr" },
        motherName: { pattern: /^[A-Za-z\s]+$/, err: "motherErr" },
        qualification: { pattern: null, err: "qualErr" },
        aadhaarNumber: { pattern: /^\d{12}$/, err: "aadhaarErr" },
        panNumber: { pattern: /^[A-Z]{5}\d{4}[A-Z]$/, err: "panErr" },
        bankName: { pattern: null, err: "bankNameErr" },
        ifscCode: { pattern: /^[A-Z]{4}0[A-Z0-9]{6}$/, err: "ifscErr" }
    };

    function setValid(id) { const el = $(id); el.classList.add("is-valid"); el.classList.remove("is-invalid"); }
    function setInvalid(id) { const el = $(id); el.classList.add("is-invalid"); el.classList.remove("is-valid"); }
    function clearState(id) { const el = $(id); el.classList.remove("is-valid","is-invalid"); }

    function validate(id) {
        const rule = rules[id];
        const val = $(id).value.trim();
        const ok = rule.pattern ? rule.pattern.test(val) : val.length > 0;
        ok ? setValid(id) : setInvalid(id);
        toggleSubmit();
        return ok;
    }

    function validateBankAcc() {
        const val = $("bankAccount").value.trim();
        val.length > 0 ? setValid("bankAccount") : setInvalid("bankAccount");
        toggleSubmit();
        return val.length > 0;
    }

    function validateBankConfirm() {
        const match = $("bankAccount").value.trim() === $("bankAccountConfirm").value.trim() && $("bankAccountConfirm").value.trim().length > 0;
        match ? setValid("bankAccountConfirm") : setInvalid("bankAccountConfirm");
        toggleSubmit();
        return match;
    }

    function validateFile(id) {
        const f = $(id).files[0];
        if (!f) { setInvalid(id); toggleSubmit(); return false; }
        const ext = f.name.split(".").pop().toLowerCase();
        const ok = ["pdf","jpg","jpeg","png"].includes(ext) && f.size <= 2*1024*1024;
        ok ? setValid(id) : setInvalid(id);
        toggleSubmit();
        return ok;
    }

    function isFormValid() {
        const required = ["facultyName","mobileNumber","collegeEmail","personalEmail","fatherName","motherName","qualification","aadhaarNumber","bankName","ifscCode","bankAccount","bankAccountConfirm"];
        for (const id of required) if (!$(id).classList.contains("is-valid")) return false;
        if (!$("aadhaarFile").classList.contains("is-valid")) return false;
        if ($("alternateMobile").value.trim() && !$("alternateMobile").classList.contains("is-valid")) return false;
        if ($("panNumber").value.trim() && !$("panNumber").classList.contains("is-valid")) return false;
        return true;
    }

    function toggleSubmit() { submitBtn.disabled = !isFormValid(); }

    // --- Reset ---
    resetBtn.addEventListener("click", () => {
        form.reset();
        document.querySelectorAll(".f-input").forEach(el => el.classList.remove("is-valid","is-invalid"));
        $("photoPreview").src = "https://ui-avatars.com/api/?name=Faculty&background=6366f1&color=fff&size=128";
        submitBtn.disabled = true;
    });

    // --- Toast ---
    function showToast(type, msg) {
        const t = $("toastBox");
        const ok = type === "success";
        t.style.background = ok ? "rgba(16,185,129,.95)" : "rgba(239,68,68,.95)";
        t.style.color = "#fff";
        t.innerHTML = `<i class="fa-solid ${ok?"fa-circle-check":"fa-circle-exclamation"} me-2"></i>${msg}`;
        t.style.display = "block";
        setTimeout(() => t.style.display = "none", 5000);
    }

    // --- Submit ---
    form.addEventListener("submit", async e => {
        e.preventDefault();
        if (!isFormValid()) return;

        submitBtn.disabled = true;
        spinner.classList.remove("d-none");
        submitIcon.classList.add("d-none");

        const fd = new FormData();
        ["facultyName","mobileNumber","alternateMobile","collegeEmail","personalEmail",
         "bankAccount","bankName","ifscCode","fatherName","motherName","qualification","tcsCode","aadhaarNumber","panNumber"]
            .forEach(id => fd.append(id, $(id).value.trim()));

        const af = $("aadhaarFile").files[0];
        const pf = $("panFile").files[0];
        const ph = $("passportPhoto").files[0];
        if (af) fd.append("aadhaarFile", af);
        if (pf) fd.append("panFile", pf);
        if (ph) fd.append("passportPhoto", ph);

        try {
            const res = await fetch(API, { method:"POST", body:fd });
            const data = await res.json();
            if (data.success) {
                showToast("success", "Faculty registered successfully!");
                resetBtn.click();
            } else {
                showToast("error", data.message || "Registration failed.");
                submitBtn.disabled = false;
            }
        } catch {
            showToast("error", "Network error. Please check server connection.");
            submitBtn.disabled = false;
        } finally {
            spinner.classList.add("d-none");
            submitIcon.classList.remove("d-none");
        }
    });
});