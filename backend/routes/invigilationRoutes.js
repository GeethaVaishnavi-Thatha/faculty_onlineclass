const express = require('express');
const router  = express.Router();

const {
    getStaffForAllocation,
    saveChart,
    getAllCharts,
    getChartById,
    deleteChart,
    autoAllocate,
    downloadChartExcel
} = require('../controllers/invigilationController');

// Specific paths before /:id
router.get('/staff',            getStaffForAllocation); // ?role=&department=&availability=
router.post('/auto-allocate',   autoAllocate);
router.get('/:id/excel',        downloadChartExcel);

// CRUD
router.get('/',                 getAllCharts);
router.post('/',                saveChart);
router.get('/:id',              getChartById);
router.delete('/:id',           deleteChart);

module.exports = router;
