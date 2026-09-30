const express = require("express");
const router = express.Router();
const {
    getTeacherPayments,
    confirmTeacherPayment
} = require("../controllers/teacherPaymentController");

router.get("/", getTeacherPayments);
router.patch("/:id/pay", confirmTeacherPayment);

module.exports = router;