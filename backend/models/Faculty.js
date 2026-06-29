const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
    regId: { type: String, required: true, unique: true },
    facultyName: { type: String, required: true, trim: true },
    mobileNumber: { type: String, required: true, unique: true, trim: true },
    alternateMobile: { type: String, trim: true, default: null },
    collegeEmail: { type: String, required: true, trim: true, lowercase: true },
    personalEmail: { type: String, required: true, trim: true, lowercase: true },
    bankAccount: { type: String, required: true, trim: true },
    bankName: { type: String, required: true, trim: true },
    ifscCode: { type: String, required: true, trim: true, uppercase: true },
    fatherName: { type: String, required: true, trim: true },
    motherName: { type: String, required: true, trim: true },
    qualification: { type: String, required: true },
    tcsCode: { type: String, trim: true, default: null },
    aadhaarNumber: { type: String, required: true, unique: true, trim: true },
    aadhaarFile: { type: String, required: true },
    panNumber: { type: String, trim: true, uppercase: true, sparse: true, default: null },
    panFile: { type: String, default: null },
    passportPhoto: { type: String, default: null },
    registrationDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Faculty', facultySchema);