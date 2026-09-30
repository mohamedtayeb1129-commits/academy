// routes/dashboardRoutes.js
const express = require('express');
const { getTotals, getStudentsByLevel,getFinancialSummary, getPaymentsThisMonth, getMonthlyPayments, getTuitionFees, getDashboardSummary, getMonthlyPaymentsDashboard, getPaymentsSummary } = require('../controllers/DashboardController');
const router = express.Router();

router.get('/totals', getTotals);


router.get('/students-by-level', getStudentsByLevel);

router.get('/payments-this-month', getPaymentsThisMonth);

router.get('/monthly-payments', getMonthlyPayments);

router.get('/tuition-fees', getTuitionFees);

router.get('/summary', getDashboardSummary);

router.get('/summary-financial', getFinancialSummary);

router.get(
  "/payments-summary",

  getPaymentsSummary

);
 
router.get(
  "/monthly-payments",
  getMonthlyPayments

);
module.exports = router;
