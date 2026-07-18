const express = require('express');
const router  = express.Router();

const {
    getDutyChart,
    setShift,
    addAmount,
    resetAmount
} = require('../controllers/dutyChartController');

router.get('/',                  getDutyChart);          // GET all faculty with duty data
router.put('/:id/shift',         setShift);              // PUT shift for one faculty
router.put('/:id/add-amount',    addAmount);             // PUT add amount (requires shift)
router.put('/:id/reset-amount',  resetAmount);           // PUT reset amount to 0

module.exports = router;
