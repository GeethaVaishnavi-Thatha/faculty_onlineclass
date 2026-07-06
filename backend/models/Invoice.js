const mongoose = require('mongoose');

/**
 * Invoice Model
 * Stores generated payment statements for exam staff.
 */

// Each line item in the invoice
const invoiceEntrySchema = new mongoose.Schema({
    staffId:       { type: String, default: null },
    name:          { type: String, required: true, trim: true },
    role:          { type: String, required: true, trim: true },
    phone:         { type: String, trim: true, default: '' },
    accountNumber: { type: String, trim: true, default: '' },
    amount:        { type: Number, required: true, min: 0, default: 0 }
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
    invoiceNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    examDate: {
        type: Date,
        required: [true, 'Exam date is required']
    },
    entries: {
        type: [invoiceEntrySchema],
        required: true,
        validate: {
            validator: (v) => Array.isArray(v) && v.length > 0,
            message: 'Invoice must have at least one entry'
        }
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    defaultAmount: {
        type: Number,
        default: 1500
    },
    generatedOn: {
        type: Date,
        default: Date.now
    },
    notes: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Auto-generate invoice number before saving
invoiceSchema.pre('save', function (next) {
    if (!this.invoiceNumber) {
        const now = new Date();
        const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
        const rand = Math.floor(100 + Math.random() * 900);
        this.invoiceNumber = `INV-${datePart}-${rand}`;
    }
    next();
});

// Indexes
invoiceSchema.index({ examDate: -1 });
invoiceSchema.index({ generatedOn: -1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
