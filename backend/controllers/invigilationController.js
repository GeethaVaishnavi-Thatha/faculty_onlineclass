const InvigilationChart = require('../models/InvigilationChart');
const ExamStaff         = require('../models/ExamStaff');
const ExcelJS           = require('exceljs');

// ─── GET STAFF FOR ALLOCATION ─────────────────────────────────────────────
/**
 * Returns all active staff with availability info for the allocation UI.
 * Optionally filters by role/department.
 */
const getStaffForAllocation = async (req, res) => {
    try {
        const { role, department, availability } = req.query;
        const query = { status: 'Active' };
        if (role         && role         !== 'All') query.role         = role;
        if (department   && department   !== 'All') query.department   = department;
        if (availability && availability !== 'All') query.availability = availability;

        const staff = await ExamStaff.find(query)
            .sort({ name: 1 })
            .select('staffId name role department experience availability phone')
            .lean();

        res.status(200).json({ success: true, data: staff });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

// ─── SAVE CHART ───────────────────────────────────────────────────────────
const saveChart = async (req, res) => {
    try {
        const { examDate, department, building, floor, allocations, notes } = req.body;

        if (!examDate) return res.status(400).json({ success: false, message: 'Exam date is required.' });
        if (!Array.isArray(allocations)) {
            return res.status(400).json({ success: false, message: 'Allocations must be an array.' });
        }

        // ── Conflict Detection ──────────────────────────────────────────
        const conflicts = [];
        const seen      = {}; // staffId -> { hall, shift }

        const cleanAllocations = allocations.map((a, idx) => {
            const key = a.staffId;
            if (seen[key]) {
                // Same staff assigned twice in same chart
                conflicts.push({
                    staffId: key,
                    name:    a.name,
                    reason:  `Duplicate allocation: already assigned to ${seen[key].hall} (${seen[key].shift})`
                });
                return { ...a, status: 'Conflict' };
            }
            seen[key] = { hall: a.hall, shift: a.shift };
            return { ...a, status: a.status || 'Assigned' };
        });

        const chart = new InvigilationChart({
            examDate:    new Date(examDate),
            department:  department  || 'All',
            building:    building    || '',
            floor:       floor       || '',
            allocations: cleanAllocations,
            notes:       notes       || ''
        });

        await chart.save();

        res.status(201).json({
            success: true,
            message: conflicts.length > 0
                ? `Chart saved with ${conflicts.length} conflict(s).`
                : 'Invigilation chart saved successfully!',
            data: chart,
            conflicts
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const msg = Object.values(error.errors).map(e => e.message).join(', ');
            return res.status(400).json({ success: false, message: msg });
        }
        console.error('saveChart error:', error.message);
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

// ─── GET CHARTS (list) ────────────────────────────────────────────────────
const getAllCharts = async (req, res) => {
    try {
        const { page = 1, limit = 10, sort = 'examDate', order = 'desc' } = req.query;

        const pageNum  = Math.max(1, parseInt(page,  10));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
        const skip     = (pageNum - 1) * limitNum;
        const sortDir  = order === 'asc' ? 1 : -1;

        const [data, total] = await Promise.all([
            InvigilationChart.find()
                .sort({ [sort]: sortDir })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            InvigilationChart.countDocuments()
        ]);

        res.status(200).json({
            success: true,
            data,
            pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

// ─── GET CHART BY ID ──────────────────────────────────────────────────────
const getChartById = async (req, res) => {
    try {
        const chart = await InvigilationChart.findById(req.params.id).lean();
        if (!chart) return res.status(404).json({ success: false, message: 'Chart not found.' });
        res.status(200).json({ success: true, data: chart });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

// ─── DELETE CHART ─────────────────────────────────────────────────────────
const deleteChart = async (req, res) => {
    try {
        const chart = await InvigilationChart.findByIdAndDelete(req.params.id);
        if (!chart) return res.status(404).json({ success: false, message: 'Chart not found.' });
        res.status(200).json({ success: true, message: 'Chart deleted successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

// ─── AUTO ALLOCATE ────────────────────────────────────────────────────────
/**
 * Intelligent auto-allocation algorithm.
 * Distributes available staff across halls and shifts fairly.
 * Avoids duplicates, prioritizes availability.
 */
const autoAllocate = async (req, res) => {
    try {
        const { halls = [], shifts = ['Shift 1', 'Shift 2', 'Shift 3'], role, department, staffPerHall = 2 } = req.body;

        if (!halls.length) return res.status(400).json({ success: false, message: 'At least one hall required.' });

        const query = { status: 'Active', availability: 'Available' };
        if (role       && role       !== 'All') query.role       = role;
        if (department && department !== 'All') query.department = department;

        const staff = await ExamStaff.find(query).sort({ experience: -1, name: 1 }).lean();

        if (!staff.length) {
            return res.status(200).json({
                success: false,
                message: 'No available staff found for allocation.',
                allocations: []
            });
        }

        const allocations = [];
        const assigned    = new Set();
        let   staffIdx    = 0;

        for (const hall of halls) {
            for (const shift of shifts) {
                for (let slot = 0; slot < parseInt(staffPerHall); slot++) {
                    // Find next unassigned staff
                    let attempts = 0;
                    while (staffIdx < staff.length && attempts < staff.length) {
                        const s = staff[staffIdx % staff.length];
                        staffIdx++;
                        attempts++;
                        if (!assigned.has(s.staffId)) {
                            assigned.add(s.staffId);
                            allocations.push({
                                staffId:    s.staffId,
                                name:       s.name,
                                role:       s.role,
                                department: s.department,
                                hall,
                                shift,
                                building:   req.body.building || '',
                                floor:      req.body.floor    || '',
                                status:     'Assigned'
                            });
                            break;
                        }
                    }
                }
            }
        }

        const unassigned = staff.filter(s => !assigned.has(s.staffId));

        res.status(200).json({
            success:     true,
            allocations,
            totalAssigned:   allocations.length,
            totalUnassigned: unassigned.length,
            message:     `Auto-allocated ${allocations.length} staff across ${halls.length} hall(s).`
        });
    } catch (error) {
        console.error('autoAllocate error:', error.message);
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

// ─── EXPORT CHART EXCEL ───────────────────────────────────────────────────
const downloadChartExcel = async (req, res) => {
    try {
        const chart = await InvigilationChart.findById(req.params.id).lean();
        if (!chart) return res.status(404).json({ success: false, message: 'Chart not found.' });

        const workbook = new ExcelJS.Workbook();
        const sheet    = workbook.addWorksheet('Invigilation Chart');

        const headerFill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B21B6' } };
        const headerFont  = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        const borderStyle = { style: 'thin', color: { argb: 'FFCCCCCC' } };
        const cellBorder  = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle };

        sheet.columns = [
            { header: 'S.No',       key: 'sno',        width: 6  },
            { header: 'Name',       key: 'name',       width: 22 },
            { header: 'Role',       key: 'role',       width: 20 },
            { header: 'Department', key: 'department', width: 20 },
            { header: 'Hall',       key: 'hall',       width: 14 },
            { header: 'Shift',      key: 'shift',      width: 14 },
            { header: 'Building',   key: 'building',   width: 14 },
            { header: 'Floor',      key: 'floor',      width: 10 },
            { header: 'Status',     key: 'status',     width: 14 }
        ];

        sheet.getRow(1).eachCell(cell => {
            cell.fill      = headerFill;
            cell.font      = headerFont;
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border    = cellBorder;
        });
        sheet.getRow(1).height = 28;

        chart.allocations.forEach((a, i) => {
            const row = sheet.addRow({
                sno:        i + 1,
                name:       a.name,
                role:       a.role,
                department: a.department,
                hall:       a.hall,
                shift:      a.shift,
                building:   a.building,
                floor:      a.floor,
                status:     a.status
            });
            row.eachCell(cell => {
                cell.border    = cellBorder;
                cell.alignment = { vertical: 'middle' };
            });
            if (i % 2 === 1) {
                row.eachCell(cell => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } };
                });
            }
            row.height = 20;
        });

        const dateStr = new Date(chart.examDate).toISOString().slice(0, 10);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="InvigilationChart_${dateStr}.xlsx"`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Chart Excel error:', error.message);
        res.status(500).json({ success: false, message: 'Excel generation failed: ' + error.message });
    }
};

module.exports = {
    getStaffForAllocation,
    saveChart,
    getAllCharts,
    getChartById,
    deleteChart,
    autoAllocate,
    downloadChartExcel
};
