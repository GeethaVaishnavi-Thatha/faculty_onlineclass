const mongoose = require('mongoose');

/**
 * DutyChart Model
 * Stores per-faculty shift assignment and cumulative duty amount
 * for the Invigilation Chart page.
 * One document per faculty member.
 */
const dutyChartSchema = new mongoose.Schema({
    facultyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Faculty',
        required: true,
        unique: true
    },
    facultyName:   { type: String, required: true, trim: true },
    qualification: { type: String, trim: true, default: '' },
    mobileNumber:  { type: String, trim: true, default: '' },
    bankAccount:   { type: String, trim: true, default: '' },
    shift: {
        type: String,
        enum: ['Morning (8AM–12PM)', 'Afternoon (12PM–4PM)', 'Evening (4PM–8PM)', ''],
        default: ''
    },
    amount: {
        type: Number,
        default: 0,
        min: 0
    }
}, { timestamps: true });



module.exports = mongoose.model('DutyChart', dutyChartSchema);
