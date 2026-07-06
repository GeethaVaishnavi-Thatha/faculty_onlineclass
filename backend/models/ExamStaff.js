const mongoose = require('mongoose');

/**
 * ExamStaff Model
 * Lightweight model for admin-side exam staff management.
 * Separate from Faculty.js to preserve existing registration flow.
 */
const examStaffSchema = new mongoose.Schema({
    staffId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [3, 'Name must be at least 3 characters']
    },
    role: {
        type: String,
        required: [true, 'Role is required'],
        enum: ['Invigilator', 'Observer', 'Support Staff', 'Chief Superintendent', 'Deputy Superintendent'],
        trim: true
    },
    department: {
        type: String,
        required: [true, 'Department is required'],
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        match: [/^[6-9]\d{9}$/, 'Enter a valid 10-digit phone number']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address']
    },
    dateOfBirth: {
        type: Date,
        default: null
    },
    address: {
        type: String,
        trim: true,
        default: null
    },
    bankAccount: {
        type: String,
        required: [true, 'Bank account number is required'],
        trim: true
    },
    ifscCode: {
        type: String,
        required: [true, 'IFSC code is required'],
        trim: true,
        uppercase: true,
        match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter a valid IFSC code']
    },
    experience: {
        type: Number,
        default: 0,
        min: 0
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    },
    availability: {
        type: String,
        enum: ['Available', 'Unavailable', 'On Leave'],
        default: 'Available'
    },
    registrationDate: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Auto-generate staffId before saving
examStaffSchema.pre('save', function (next) {
    if (!this.staffId) {
        const ts = Date.now();
        const rand = Math.floor(1000 + Math.random() * 9000);
        this.staffId = `STF-${ts}-${rand}`;
    }
    next();
});

// Indexes for fast search
examStaffSchema.index({ name: 'text', email: 'text', department: 'text' });
examStaffSchema.index({ status: 1, availability: 1 });
examStaffSchema.index({ registrationDate: -1 });

module.exports = mongoose.model('ExamStaff', examStaffSchema);
