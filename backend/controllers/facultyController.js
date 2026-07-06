const Faculty = require('../models/Faculty');
const ExcelJS = require('exceljs');

const generateRegId = () => {
    const timestamp = Date.now();
    const random = Math.floor(10000 + Math.random() * 90000);
    return `FAC-${timestamp}-${random}`;
};

const createFaculty = async (req, res) => {
    try {
        console.log('--- CREATE FACULTY REQUEST ---');
        console.log('Body:', JSON.stringify(req.body));
        console.log('Files:', req.files ? Object.keys(req.files) : 'NO FILES');

        const {
            facultyName, mobileNumber, alternateMobile,
            collegeEmail, personalEmail,
            bankAccount, bankName, ifscCode,
            fatherName, motherName, qualification, tcsCode,
            aadhaarNumber, panNumber
        } = req.body;

        // Aadhaar file is required
        if (!req.files || !req.files['aadhaarFile']) {
            return res.status(400).json({ success: false, message: "Aadhaar document is required." });
        }

        const duplicateMobile = await Faculty.findOne({ mobileNumber });
        if (duplicateMobile) return res.status(400).json({ success: false, message: "Mobile Number already registered." });

        const duplicateAadhaar = await Faculty.findOne({ aadhaarNumber });
        if (duplicateAadhaar) return res.status(400).json({ success: false, message: "Aadhaar Number already registered." });

        // Only check PAN duplicate if provided
        if (panNumber) {
            const duplicatePAN = await Faculty.findOne({ panNumber });
            if (duplicatePAN) return res.status(400).json({ success: false, message: "PAN Number already registered." });
        }

        const newFaculty = new Faculty({
            regId: generateRegId(),
            facultyName,
            mobileNumber,
            alternateMobile: alternateMobile && alternateMobile.trim() ? alternateMobile.trim() : null,
            collegeEmail,
            personalEmail,
            bankAccount,
            bankName,
            ifscCode,
            fatherName,
            motherName,
            qualification,
            tcsCode: tcsCode && tcsCode.trim() ? tcsCode.trim() : null,
            aadhaarNumber,
            aadhaarFile: req.files['aadhaarFile'][0].filename,
            panNumber: panNumber && panNumber.trim() ? panNumber.trim() : null,
            panFile: req.files && req.files['panFile'] ? req.files['panFile'][0].filename : null,
            passportPhoto: req.files && req.files['passportPhoto'] ? req.files['passportPhoto'][0].filename : null
        });

        console.log('Saving faculty document...');
        await newFaculty.save();
        console.log('Faculty saved successfully! RegID:', newFaculty.regId);
        res.status(201).json({ success: true, message: "Faculty registered successfully!", data: newFaculty });
    } catch (error) {
        console.error("========== CREATE FACULTY ERROR ==========");
        console.error("Message:", error.message);
        console.error("Code:", error.code);
        console.error("Full Error:", JSON.stringify(error, null, 2));
        console.error("=========================================");
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0] || 'field';
            return res.status(400).json({
                success: false,
                message: `Duplicate entry: ${field} already registered. Please use a different value.`
            });
        }
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
};

const getAllFaculty = async (req, res) => {
    try {
        const { search } = req.query;
        let query = {};
        if (search) {
            query = {
                $or: [
                    { facultyName: { $regex: search, $options: 'i' } },
                    { regId: { $regex: search, $options: 'i' } },
                    { mobileNumber: { $regex: search, $options: 'i' } }
                ]
            };
        }
        const faculties = await Faculty.find(query).sort({ registrationDate: -1 });
        res.status(200).json({ success: true, data: faculties });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
};

const getFacultyById = async (req, res) => {
    try {
        const faculty = await Faculty.findById(req.params.id);
        if (!faculty) return res.status(404).json({ success: false, message: "Faculty record not found." });
        res.status(200).json({ success: true, data: faculty });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
};

const updateFaculty = async (req, res) => {
    try {
        const {
            facultyName, mobileNumber, alternateMobile,
            collegeEmail, personalEmail,
            bankAccount, bankName, ifscCode,
            fatherName, motherName, qualification, tcsCode,
            aadhaarNumber, panNumber,
            status, availability, experience, department
        } = req.body;

        const faculty = await Faculty.findById(req.params.id);
        if (!faculty) return res.status(404).json({ success: false, message: "Faculty record not found." });

        if (mobileNumber !== faculty.mobileNumber) {
            const dup = await Faculty.findOne({ mobileNumber });
            if (dup) return res.status(400).json({ success: false, message: "Mobile Number already in use." });
        }
        if (aadhaarNumber !== faculty.aadhaarNumber) {
            const dup = await Faculty.findOne({ aadhaarNumber });
            if (dup) return res.status(400).json({ success: false, message: "Aadhaar Number already in use." });
        }
        if (panNumber && panNumber !== faculty.panNumber) {
            const dup = await Faculty.findOne({ panNumber });
            if (dup) return res.status(400).json({ success: false, message: "PAN Number already in use." });
        }

        faculty.facultyName = facultyName || faculty.facultyName;
        faculty.mobileNumber = mobileNumber || faculty.mobileNumber;
        faculty.alternateMobile = alternateMobile && alternateMobile.trim() ? alternateMobile.trim() : null;
        faculty.collegeEmail = collegeEmail || faculty.collegeEmail;
        faculty.personalEmail = personalEmail || faculty.personalEmail;
        faculty.bankAccount = bankAccount || faculty.bankAccount;
        faculty.bankName = bankName || faculty.bankName;
        faculty.ifscCode = ifscCode || faculty.ifscCode;
        faculty.fatherName = fatherName || faculty.fatherName;
        faculty.motherName = motherName || faculty.motherName;
        faculty.qualification = qualification || faculty.qualification;
        faculty.tcsCode = tcsCode && tcsCode.trim() ? tcsCode.trim() : null;
        faculty.aadhaarNumber = aadhaarNumber || faculty.aadhaarNumber;
        faculty.panNumber = panNumber && panNumber.trim() ? panNumber.trim() : null;
        
        if (status) faculty.status = status;
        if (availability) faculty.availability = availability;
        if (experience !== undefined) faculty.experience = Number(experience);
        if (department) faculty.department = department;

        if (req.files) {
            if (req.files['aadhaarFile']) faculty.aadhaarFile = req.files['aadhaarFile'][0].filename;
            if (req.files['panFile']) faculty.panFile = req.files['panFile'][0].filename;
            if (req.files['passportPhoto']) faculty.passportPhoto = req.files['passportPhoto'][0].filename;
        }

        await faculty.save();
        res.status(200).json({ success: true, message: "Faculty record updated successfully!", data: faculty });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
};

const deleteFaculty = async (req, res) => {
    try {
        const faculty = await Faculty.findByIdAndDelete(req.params.id);
        if (!faculty) return res.status(404).json({ success: false, message: "Faculty record not found." });
        res.status(200).json({ success: true, message: "Faculty record deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
};

const downloadExcel = async (req, res) => {
    try {
        const faculties = await Faculty.find().sort({ registrationDate: -1 });

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Faculty Registration Portal';
        workbook.created = new Date();

        const sheet = workbook.addWorksheet('Faculty Records', {
            pageSetup: { paperSize: 9, orientation: 'landscape' }
        });

        // Header style
        const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
        const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Segoe UI' };
        const borderStyle = { style: 'thin', color: { argb: 'FFCCCCCC' } };
        const cellBorder = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle };

        sheet.columns = [
            { header: 'S.No', key: 'sno', width: 7 },
            { header: 'Reg ID', key: 'regId', width: 22 },
            { header: 'Faculty Name', key: 'facultyName', width: 22 },
            { header: 'Mobile Number', key: 'mobileNumber', width: 16 },
            { header: 'Alternate Mobile', key: 'alternateMobile', width: 16 },
            { header: 'College Email', key: 'collegeEmail', width: 28 },
            { header: 'Personal Email', key: 'personalEmail', width: 28 },
            { header: 'Bank Account No', key: 'bankAccount', width: 20 },
            { header: 'Bank Name', key: 'bankName', width: 22 },
            { header: 'IFSC Code', key: 'ifscCode', width: 14 },
            { header: "Father's Name", key: 'fatherName', width: 20 },
            { header: "Mother's Name", key: 'motherName', width: 20 },
            { header: 'Qualification', key: 'qualification', width: 14 },
            { header: 'TCS Code', key: 'tcsCode', width: 14 },
            { header: 'Aadhaar Number', key: 'aadhaarNumber', width: 18 },
            { header: 'PAN Number', key: 'panNumber', width: 14 },
            { header: 'Registration Date', key: 'registrationDate', width: 22 }
        ];

        // Style header row
        sheet.getRow(1).eachCell((cell) => {
            cell.fill = headerFill;
            cell.font = headerFont;
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = cellBorder;
        });
        sheet.getRow(1).height = 28;

        // Add data rows
        faculties.forEach((f, i) => {
            const row = sheet.addRow({
                sno: i + 1,
                regId: f.regId,
                facultyName: f.facultyName,
                mobileNumber: f.mobileNumber,
                alternateMobile: f.alternateMobile || 'N/A',
                collegeEmail: f.collegeEmail,
                personalEmail: f.personalEmail,
                bankAccount: f.bankAccount,
                bankName: f.bankName,
                ifscCode: f.ifscCode,
                fatherName: f.fatherName,
                motherName: f.motherName,
                qualification: f.qualification,
                tcsCode: f.tcsCode || 'N/A',
                aadhaarNumber: f.aadhaarNumber.slice(0, 4) + 'XXXX' + f.aadhaarNumber.slice(-4),
                panNumber: f.panNumber || 'N/A',
                registrationDate: new Date(f.registrationDate).toLocaleString('en-IN')
            });

            row.eachCell((cell) => {
                cell.alignment = { vertical: 'middle', horizontal: 'left' };
                cell.border = cellBorder;
                cell.font = { name: 'Segoe UI', size: 10 };
            });

            if (i % 2 === 1) {
                row.eachCell((cell) => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
                });
            }

            row.height = 20;
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Faculty_Records_${Date.now()}.xlsx"`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error("Excel Download Error:", error);
        res.status(500).json({ success: false, message: "Excel generation failed: " + error.message });
    }
};

const getFacultyStats = async (req, res) => {
    try {
        const [total, active, inactive, available] = await Promise.all([
            Faculty.countDocuments(),
            Faculty.countDocuments({ status: 'Active' }),
            Faculty.countDocuments({ status: 'Inactive' }),
            Faculty.countDocuments({ status: 'Active', availability: 'Available' })
        ]);

        const roleBreakdown = await Faculty.aggregate([
            { $group: { _id: '$qualification', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const recent = await Faculty.find()
            .sort({ registrationDate: -1 })
            .limit(5)
            .select('facultyName qualification department registrationDate')
            .lean();

        const mappedRecent = recent.map(r => ({
            name: r.facultyName,
            role: r.qualification,
            department: r.department,
            registrationDate: r.registrationDate
        }));

        res.status(200).json({
            success: true,
            data: {
                total,
                active,
                inactive,
                available,
                roleBreakdown,
                recent: mappedRecent
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

const getAllFacultyFull = async (req, res) => {
    try {
        const { availability, qualification } = req.query;
        const query = { status: 'Active' };
        if (availability && availability !== 'All') query.availability = availability;
        if (qualification && qualification !== 'All') query.qualification = qualification;

        const data = await Faculty.find(query).sort({ facultyName: 1 }).lean();
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

module.exports = { 
    createFaculty, 
    getAllFaculty, 
    getFacultyById, 
    updateFaculty, 
    deleteFaculty, 
    downloadExcel,
    getFacultyStats,
    getAllFacultyFull
};
