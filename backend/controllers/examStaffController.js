const ExamStaff = require('../models/ExamStaff');
const ExcelJS   = require('exceljs');

// ─── Helper ────────────────────────────────────────────────────────────────
const generateStaffId = () => {
    const ts   = Date.now();
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `STF-${ts}-${rand}`;
};

// ─── CREATE ────────────────────────────────────────────────────────────────
const createStaff = async (req, res) => {
    try {
        const {
            name, role, department, phone, email,
            dateOfBirth, address, bankAccount, ifscCode,
            experience, status, availability
        } = req.body;

        // Duplicate checks
        const dupPhone = await ExamStaff.findOne({ phone });
        if (dupPhone) return res.status(400).json({ success: false, message: 'Phone number already registered.' });

        const dupEmail = await ExamStaff.findOne({ email: email.toLowerCase() });
        if (dupEmail) return res.status(400).json({ success: false, message: 'Email address already registered.' });

        const staff = new ExamStaff({
            staffId:     generateStaffId(),
            name,
            role,
            department,
            phone,
            email,
            dateOfBirth: dateOfBirth || null,
            address:     address     || null,
            bankAccount,
            ifscCode,
            experience:  experience  || 0,
            status:      status      || 'Active',
            availability: availability || 'Available'
        });

        await staff.save();
        res.status(201).json({ success: true, message: 'Staff registered successfully!', data: staff });
    } catch (error) {
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0] || 'field';
            return res.status(400).json({ success: false, message: `Duplicate: ${field} already registered.` });
        }
        if (error.name === 'ValidationError') {
            const msg = Object.values(error.errors).map(e => e.message).join(', ');
            return res.status(400).json({ success: false, message: msg });
        }
        console.error('createStaff error:', error.message);
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

// ─── GET ALL (with search + pagination) ────────────────────────────────────
const getAllStaff = async (req, res) => {
    try {
        const {
            search = '',
            page   = 1,
            limit  = 10,
            status,
            role,
            sort   = 'registrationDate',
            order  = 'desc'
        } = req.query;

        const query = {};

        if (search) {
            query.$or = [
                { name:       { $regex: search, $options: 'i' } },
                { email:      { $regex: search, $options: 'i' } },
                { phone:      { $regex: search, $options: 'i' } },
                { department: { $regex: search, $options: 'i' } },
                { staffId:    { $regex: search, $options: 'i' } }
            ];
        }

        if (status && status !== 'All') query.status = status;
        if (role   && role   !== 'All') query.role   = role;

        const pageNum  = Math.max(1, parseInt(page,  10));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
        const skip     = (pageNum - 1) * limitNum;
        const sortDir  = order === 'asc' ? 1 : -1;

        const [data, total] = await Promise.all([
            ExamStaff.find(query)
                .sort({ [sort]: sortDir })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            ExamStaff.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            data,
            pagination: {
                total,
                page:       pageNum,
                limit:      limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('getAllStaff error:', error.message);
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

// ─── GET ALL (no pagination — for invigilation dropdown) ───────────────────
const getAllStaffFull = async (req, res) => {
    try {
        const { availability, role } = req.query;
        const query = { status: 'Active' };
        if (availability && availability !== 'All') query.availability = availability;
        if (role && role !== 'All') query.role = role;

        const data = await ExamStaff.find(query).sort({ name: 1 }).lean();
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('getAllStaffFull error:', error.message);
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

// ─── GET ONE ───────────────────────────────────────────────────────────────
const getStaffById = async (req, res) => {
    try {
        const staff = await ExamStaff.findById(req.params.id).lean();
        if (!staff) return res.status(404).json({ success: false, message: 'Staff record not found.' });
        res.status(200).json({ success: true, data: staff });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

// ─── UPDATE ────────────────────────────────────────────────────────────────
const updateStaff = async (req, res) => {
    try {
        const {
            name, role, department, phone, email,
            dateOfBirth, address, bankAccount, ifscCode,
            experience, status, availability
        } = req.body;

        const staff = await ExamStaff.findById(req.params.id);
        if (!staff) return res.status(404).json({ success: false, message: 'Staff record not found.' });

        // Duplicate checks only if value changed
        if (phone && phone !== staff.phone) {
            const dup = await ExamStaff.findOne({ phone });
            if (dup) return res.status(400).json({ success: false, message: 'Phone number already in use.' });
        }
        if (email && email.toLowerCase() !== staff.email) {
            const dup = await ExamStaff.findOne({ email: email.toLowerCase() });
            if (dup) return res.status(400).json({ success: false, message: 'Email already in use.' });
        }

        if (name)        staff.name        = name;
        if (role)        staff.role        = role;
        if (department)  staff.department  = department;
        if (phone)       staff.phone       = phone;
        if (email)       staff.email       = email.toLowerCase();
        if (bankAccount) staff.bankAccount = bankAccount;
        if (ifscCode)    staff.ifscCode    = ifscCode.toUpperCase();
        staff.dateOfBirth  = dateOfBirth  || null;
        staff.address      = address      || null;
        staff.experience   = experience   !== undefined ? experience : staff.experience;
        staff.status       = status       || staff.status;
        staff.availability = availability || staff.availability;

        await staff.save();
        res.status(200).json({ success: true, message: 'Staff updated successfully!', data: staff });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const msg = Object.values(error.errors).map(e => e.message).join(', ');
            return res.status(400).json({ success: false, message: msg });
        }
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

// ─── DELETE ────────────────────────────────────────────────────────────────
const deleteStaff = async (req, res) => {
    try {
        const staff = await ExamStaff.findByIdAndDelete(req.params.id);
        if (!staff) return res.status(404).json({ success: false, message: 'Staff record not found.' });
        res.status(200).json({ success: true, message: 'Staff record deleted successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

// ─── STATS ─────────────────────────────────────────────────────────────────
const getStaffStats = async (req, res) => {
    try {
        const [total, active, inactive, available] = await Promise.all([
            ExamStaff.countDocuments(),
            ExamStaff.countDocuments({ status: 'Active' }),
            ExamStaff.countDocuments({ status: 'Inactive' }),
            ExamStaff.countDocuments({ status: 'Active', availability: 'Available' })
        ]);

        // Role breakdown
        const roleBreakdown = await ExamStaff.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Recent 5 registrations
        const recent = await ExamStaff.find()
            .sort({ registrationDate: -1 })
            .limit(5)
            .select('name role department registrationDate')
            .lean();

        res.status(200).json({
            success: true,
            data: { total, active, inactive, available, roleBreakdown, recent }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

// ─── EXPORT EXCEL ──────────────────────────────────────────────────────────
const downloadExcel = async (req, res) => {
    try {
        const staff = await ExamStaff.find().sort({ registrationDate: -1 }).lean();

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Admin Dashboard';
        workbook.created = new Date();

        const sheet = workbook.addWorksheet('Exam Staff', {
            pageSetup: { paperSize: 9, orientation: 'landscape' }
        });

        const headerFill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B21B6' } };
        const headerFont   = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        const borderStyle  = { style: 'thin', color: { argb: 'FFCCCCCC' } };
        const cellBorder   = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle };

        sheet.columns = [
            { header: 'S.No',              key: 'sno',              width: 7  },
            { header: 'Staff ID',          key: 'staffId',          width: 22 },
            { header: 'Name',              key: 'name',             width: 22 },
            { header: 'Role',              key: 'role',             width: 22 },
            { header: 'Department',        key: 'department',       width: 22 },
            { header: 'Phone',             key: 'phone',            width: 15 },
            { header: 'Email',             key: 'email',            width: 28 },
            { header: 'Bank Account No',   key: 'bankAccount',      width: 20 },
            { header: 'IFSC Code',         key: 'ifscCode',         width: 14 },
            { header: 'Experience (Yrs)',  key: 'experience',       width: 16 },
            { header: 'Status',            key: 'status',           width: 12 },
            { header: 'Availability',      key: 'availability',     width: 14 },
            { header: 'Registration Date', key: 'registrationDate', width: 22 }
        ];

        sheet.getRow(1).eachCell(cell => {
            cell.fill      = headerFill;
            cell.font      = headerFont;
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border    = cellBorder;
        });
        sheet.getRow(1).height = 28;

        staff.forEach((s, i) => {
            const row = sheet.addRow({
                sno:              i + 1,
                staffId:          s.staffId,
                name:             s.name,
                role:             s.role,
                department:       s.department,
                phone:            s.phone,
                email:            s.email,
                bankAccount:      s.bankAccount,
                ifscCode:         s.ifscCode,
                experience:       s.experience || 0,
                status:           s.status,
                availability:     s.availability,
                registrationDate: new Date(s.registrationDate).toLocaleString('en-IN')
            });

            row.eachCell(cell => {
                cell.alignment = { vertical: 'middle', horizontal: 'left' };
                cell.border    = cellBorder;
                cell.font      = { size: 10 };
            });

            if (i % 2 === 1) {
                row.eachCell(cell => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } };
                });
            }
            row.height = 20;
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Exam_Staff_${Date.now()}.xlsx"`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Excel export error:', error.message);
        res.status(500).json({ success: false, message: 'Excel generation failed: ' + error.message });
    }
};

module.exports = {
    createStaff,
    getAllStaff,
    getAllStaffFull,
    getStaffById,
    updateStaff,
    deleteStaff,
    getStaffStats,
    downloadExcel
};
