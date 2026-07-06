const Invoice   = require('../models/Invoice');
const ExamStaff = require('../models/ExamStaff');
const ExcelJS   = require('exceljs');

// ─── GENERATE STATEMENT (fetch staff for a given exam date) ───────────────
/**
 * Fetches all active staff to populate the invoice form.
 * Does NOT save anything — just returns data for the frontend to display.
 */
const generateStatement = async (req, res) => {
    try {
        const { examDate } = req.query;
        if (!examDate) return res.status(400).json({ success: false, message: 'examDate query param required.' });

        // Get all active staff for the statement
        const staff = await ExamStaff.find({ status: 'Active' })
            .sort({ name: 1 })
            .select('staffId name role phone bankAccount')
            .lean();

        res.status(200).json({ success: true, data: staff, examDate });
    } catch (error) {
        console.error('generateStatement error:', error.message);
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

// ─── SAVE INVOICE ─────────────────────────────────────────────────────────
const saveInvoice = async (req, res) => {
    try {
        const { examDate, entries, notes, defaultAmount } = req.body;

        if (!examDate || !Array.isArray(entries) || entries.length === 0) {
            return res.status(400).json({ success: false, message: 'examDate and at least one entry are required.' });
        }

        // Validate entries
        const cleanEntries = entries.map((e, idx) => {
            const amt = parseFloat(e.amount);
            if (isNaN(amt) || amt < 0) throw new Error(`Invalid amount at row ${idx + 1}.`);
            return {
                staffId:       e.staffId       || null,
                name:          e.name.trim(),
                role:          e.role.trim(),
                phone:         e.phone         || '',
                accountNumber: e.accountNumber || '',
                amount:        amt
            };
        });

        const totalAmount = cleanEntries.reduce((sum, e) => sum + e.amount, 0);

        const invoice = new Invoice({
            examDate:      new Date(examDate),
            entries:       cleanEntries,
            totalAmount,
            defaultAmount: defaultAmount || 1500,
            notes:         notes || ''
        });

        await invoice.save();
        res.status(201).json({ success: true, message: 'Invoice saved successfully!', data: invoice });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const msg = Object.values(error.errors).map(e => e.message).join(', ');
            return res.status(400).json({ success: false, message: msg });
        }
        console.error('saveInvoice error:', error.message);
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

// ─── GET ALL INVOICES (with search + pagination) ──────────────────────────
const getAllInvoices = async (req, res) => {
    try {
        const {
            search = '',
            page   = 1,
            limit  = 10,
            fromDate,
            toDate,
            sort   = 'generatedOn',
            order  = 'desc'
        } = req.query;

        const query = {};

        // Date range filter
        if (fromDate || toDate) {
            query.examDate = {};
            if (fromDate) query.examDate.$gte = new Date(fromDate);
            if (toDate)   query.examDate.$lte = new Date(toDate);
        }

        // Search by invoice number
        if (search) {
            query.$or = [
                { invoiceNumber: { $regex: search, $options: 'i' } }
            ];
        }

        const pageNum  = Math.max(1, parseInt(page,  10));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
        const skip     = (pageNum - 1) * limitNum;
        const sortDir  = order === 'asc' ? 1 : -1;

        const [data, total] = await Promise.all([
            Invoice.find(query)
                .sort({ [sort]: sortDir })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Invoice.countDocuments(query)
        ]);

        // Map for table display
        const mapped = data.map(inv => ({
            _id:           inv._id,
            invoiceNumber: inv.invoiceNumber,
            examDate:      inv.examDate,
            noOfStaff:     inv.entries.length,
            totalAmount:   inv.totalAmount,
            generatedOn:   inv.generatedOn
        }));

        res.status(200).json({
            success: true,
            data: mapped,
            pagination: {
                total,
                page:       pageNum,
                limit:      limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('getAllInvoices error:', error.message);
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

// ─── GET ONE INVOICE ──────────────────────────────────────────────────────
const getInvoiceById = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id).lean();
        if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });
        res.status(200).json({ success: true, data: invoice });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

// ─── DELETE INVOICE ───────────────────────────────────────────────────────
const deleteInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findByIdAndDelete(req.params.id);
        if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });
        res.status(200).json({ success: true, message: 'Invoice deleted successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

// ─── EXPORT INVOICE EXCEL ─────────────────────────────────────────────────
const downloadInvoiceExcel = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id).lean();
        if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });

        const workbook = new ExcelJS.Workbook();
        const sheet    = workbook.addWorksheet('Statement');

        const headerFill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B21B6' } };
        const headerFont  = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        const borderStyle = { style: 'thin', color: { argb: 'FFCCCCCC' } };
        const cellBorder  = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle };

        // Title rows
        const examDateStr = new Date(invoice.examDate).toLocaleDateString('en-IN');
        sheet.mergeCells('A1:F1');
        sheet.getCell('A1').value     = 'SRI VENKATESWARA COLLEGE (Autonomous)';
        sheet.getCell('A1').font      = { bold: true, size: 14 };
        sheet.getCell('A1').alignment = { horizontal: 'center' };

        sheet.mergeCells('A2:F2');
        sheet.getCell('A2').value     = 'STATEMENT / INVOICE';
        sheet.getCell('A2').font      = { bold: true, size: 12 };
        sheet.getCell('A2').alignment = { horizontal: 'center' };

        sheet.mergeCells('A3:F3');
        sheet.getCell('A3').value     = `Exam Date: ${examDateStr}`;
        sheet.getCell('A3').alignment = { horizontal: 'right' };

        sheet.addRow([]);

        // Headers
        sheet.columns = [
            { key: 'sno',           width: 7  },
            { key: 'name',          width: 22 },
            { key: 'role',          width: 20 },
            { key: 'phone',         width: 15 },
            { key: 'accountNumber', width: 20 },
            { key: 'amount',        width: 14 }
        ];

        const headerRow = sheet.addRow(['S.No', 'Name', 'Role', 'Phone Number', 'Account Number', 'Amount (₹)']);
        headerRow.eachCell(cell => {
            cell.fill      = headerFill;
            cell.font      = headerFont;
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border    = cellBorder;
        });
        headerRow.height = 26;

        invoice.entries.forEach((e, i) => {
            const row = sheet.addRow([i + 1, e.name, e.role, e.phone, e.accountNumber, e.amount]);
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

        // Total row
        const totalRow = sheet.addRow(['', '', '', '', 'Total Amount (₹)', invoice.totalAmount]);
        totalRow.getCell(5).font   = { bold: true };
        totalRow.getCell(6).font   = { bold: true };
        totalRow.getCell(6).fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B21B6' } };
        totalRow.getCell(6).font   = { bold: true, color: { argb: 'FFFFFFFF' } };
        totalRow.getCell(6).border = cellBorder;

        const dateStr = new Date(invoice.examDate).toISOString().slice(0, 10);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Invoice_${dateStr}.xlsx"`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Invoice Excel error:', error.message);
        res.status(500).json({ success: false, message: 'Excel generation failed: ' + error.message });
    }
};

module.exports = {
    generateStatement,
    saveInvoice,
    getAllInvoices,
    getInvoiceById,
    deleteInvoice,
    downloadInvoiceExcel
};
