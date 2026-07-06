const express = require('express');
const router  = express.Router();

const {
    generateStatement,
    saveInvoice,
    getAllInvoices,
    getInvoiceById,
    deleteInvoice,
    downloadInvoiceExcel
} = require('../controllers/invoiceController');

// Specific paths before /:id
router.get('/generate',          generateStatement);     // ?examDate=YYYY-MM-DD
router.get('/:id/excel',         downloadInvoiceExcel);  // Excel for one invoice

// CRUD
router.get('/',                  getAllInvoices);
router.post('/',                 saveInvoice);
router.get('/:id',               getInvoiceById);
router.delete('/:id',            deleteInvoice);

module.exports = router;
