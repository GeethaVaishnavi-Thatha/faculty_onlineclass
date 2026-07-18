const DutyChart = require('../models/DutyChart');
const Faculty   = require('../models/Faculty');

// ─── GET ALL DUTY CHART DATA ──────────────────────────────────────
// Returns all faculty with their duty chart data merged.
// Faculty with no record yet get defaults (shift='', amount=0).
const getDutyChart = async (req, res) => {
    try {
        const allFaculty = await Faculty.find({})
            .sort({ facultyName: 1 })
            .select('_id facultyName qualification mobileNumber bankAccount')
            .lean();

        // Get all existing duty records keyed by facultyId
        const dutyRecords = await DutyChart.find({}).lean();
        const dutyMap = {};
        dutyRecords.forEach(r => { dutyMap[r.facultyId.toString()] = r; });

        const merged = allFaculty.map(f => {
            const duty = dutyMap[f._id.toString()];
            return {
                _id:           f._id,
                facultyName:   f.facultyName,
                qualification: f.qualification,
                mobileNumber:  f.mobileNumber,
                bankAccount:   f.bankAccount,
                shift:         duty ? duty.shift  : '',
                amount:        duty ? duty.amount : 0
            };
        });

        res.status(200).json({ success: true, data: merged });
    } catch (err) {
        console.error('getDutyChart error:', err.message);
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
};

// ─── SET SHIFT ────────────────────────────────────────────────────
// Creates or updates the duty chart record for a faculty member.
// Body: { shift }
const setShift = async (req, res) => {
    try {
        const { id } = req.params;         // faculty _id
        const { shift } = req.body;

        const faculty = await Faculty.findById(id).lean();
        if (!faculty) return res.status(404).json({ success: false, message: 'Faculty not found.' });

        const record = await DutyChart.findOneAndUpdate(
            { facultyId: id },
            {
                $set: {
                    facultyId:     id,
                    facultyName:   faculty.facultyName,
                    qualification: faculty.qualification,
                    mobileNumber:  faculty.mobileNumber,
                    bankAccount:   faculty.bankAccount,
                    shift:         shift || ''
                }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.status(200).json({ success: true, message: 'Shift saved.', data: record });
    } catch (err) {
        console.error('setShift error:', err.message);
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
};

// ─── ADD AMOUNT ──────────────────────────────────────────────────
// Adds amount to the current cumulative total.
// Body: { amount, shift }  (shift is required — validated here)
const addAmount = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, shift } = req.body;

        // Validation
        const amtNum = parseFloat(amount);
        if (isNaN(amtNum) || amtNum <= 0) {
            return res.status(400).json({ success: false, message: 'Amount must be a positive number.' });
        }
        if (!shift || shift.trim() === '') {
            return res.status(400).json({ success: false, message: 'Please assign a shift before adding amount.' });
        }

        const faculty = await Faculty.findById(id).lean();
        if (!faculty) return res.status(404).json({ success: false, message: 'Faculty not found.' });

        // Upsert and increment amount
        const record = await DutyChart.findOneAndUpdate(
            { facultyId: id },
            {
                $set: {
                    facultyId:     id,
                    facultyName:   faculty.facultyName,
                    qualification: faculty.qualification,
                    mobileNumber:  faculty.mobileNumber,
                    bankAccount:   faculty.bankAccount,
                    shift:         shift.trim()
                },
                $inc: { amount: amtNum }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.status(200).json({
            success: true,
            message: `₹${amtNum.toLocaleString('en-IN')} added successfully.`,
            data:    { shift: record.shift, amount: record.amount }
        });
    } catch (err) {
        console.error('addAmount error:', err.message);
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
};

// ─── RESET AMOUNT ─────────────────────────────────────────────────
// Resets a faculty member's amount to 0.
const resetAmount = async (req, res) => {
    try {
        const { id } = req.params;
        await DutyChart.findOneAndUpdate(
            { facultyId: id },
            { $set: { amount: 0 } }
        );
        res.status(200).json({ success: true, message: 'Amount reset to 0.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
};

module.exports = { getDutyChart, setShift, addAmount, resetAmount };
