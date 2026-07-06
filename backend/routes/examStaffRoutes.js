const express = require('express');
const router  = express.Router();

const {
    createStaff,
    getAllStaff,
    getAllStaffFull,
    getStaffById,
    updateStaff,
    deleteStaff,
    getStaffStats,
    downloadExcel
} = require('../controllers/examStaffController');

// Stats (must be before /:id)
router.get('/stats',          getStaffStats);
router.get('/all',            getAllStaffFull);       // no pagination — for dropdowns
router.get('/export/excel',   downloadExcel);

// CRUD
router.get('/',               getAllStaff);           // paginated list
router.post('/',              createStaff);
router.get('/:id',            getStaffById);
router.put('/:id',            updateStaff);
router.delete('/:id',         deleteStaff);

module.exports = router;
