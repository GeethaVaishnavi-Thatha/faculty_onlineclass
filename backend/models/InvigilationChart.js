const mongoose = require('mongoose');

/**
 * InvigilationChart Model
 * Stores exam duty allocation — which staff is assigned to which hall/shift.
 */

const allocationSchema = new mongoose.Schema({
    staffId:    { type: String, required: true },
    name:       { type: String, required: true, trim: true },
    role:       { type: String, required: true, trim: true },
    department: { type: String, trim: true, default: '' },
    hall:       { type: String, required: true, trim: true },
    shift:      { type: String, required: true, trim: true },
    building:   { type: String, trim: true, default: '' },
    floor:      { type: String, trim: true, default: '' },
    status: {
        type: String,
        enum: ['Assigned', 'Confirmed', 'Absent', 'Conflict'],
        default: 'Assigned'
    }
}, { _id: false });

const invigilationChartSchema = new mongoose.Schema({
    chartId: {
        type: String,
        required: true,
        unique: true
    },
    examDate: {
        type: Date,
        required: [true, 'Exam date is required']
    },
    department: {
        type: String,
        trim: true,
        default: 'All'
    },
    building: {
        type: String,
        trim: true,
        default: ''
    },
    floor: {
        type: String,
        trim: true,
        default: ''
    },
    allocations: {
        type: [allocationSchema],
        default: []
    },
    totalAssigned: {
        type: Number,
        default: 0
    },
    notes: {
        type: String,
        default: ''
    },
    createdBy: {
        type: String,
        default: 'admin'
    }
}, {
    timestamps: true
});

// Auto-generate chartId
invigilationChartSchema.pre('save', function (next) {
    if (!this.chartId) {
        const now = new Date();
        const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
        const rand = Math.floor(100 + Math.random() * 900);
        this.chartId = `CHART-${datePart}-${rand}`;
    }
    // Keep totalAssigned in sync
    this.totalAssigned = this.allocations.length;
    next();
});

// Indexes
invigilationChartSchema.index({ examDate: -1 });
invigilationChartSchema.index({ 'allocations.staffId': 1 });

module.exports = mongoose.model('InvigilationChart', invigilationChartSchema);
