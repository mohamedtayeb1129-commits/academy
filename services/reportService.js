const { Op } = require("sequelize");
const Subscription = require("../models/Subscription");
const StaffPayment = require("../models/StaffPayment");
const TeacherPayment = require("../models/TeacherPayment");
const Purchase = require("../models/Purchase");
const { Student, Zone, Teacher } = require("../models"); // adjust path to your models/index.js
const { getPeriodRange, getYearPeriods } = require("../utils/period");

async function getPeriodData(start, end, label) {
    const dateFilter = { createdAt: { [Op.gte]: start, [Op.lt]: end } };

    const [subscriptions, staffPayments, teacherPayments, purchases] = await Promise.all([
        Subscription.findAll({
            where: { ...dateFilter, status: "payé" },
            include: [
                { model: Student, as: "student", attributes: ["id", "name"] }, // adjust attrs to your Student model
                { model: Zone, as: "zone", attributes: ["id", "label"] }
            ],
            raw: true,
            nest: true
        }),
        StaffPayment.findAll({
            where: { ...dateFilter, status: "payé" },
            raw: true
        }),
        TeacherPayment.findAll({
            where: { ...dateFilter, status: "payé" },
            include: [{ model: Teacher, as: "paymentTeacher", attributes: ["id", "name"] }], // adjust attrs
            raw: true,
            nest: true
        }),
        Purchase.findAll({
            where: { ...dateFilter },
            raw: true
        })
    ]);

    const revenue = subscriptions.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const staffExpense = staffPayments.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const teacherExpense = teacherPayments.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const purchaseExpense = purchases.reduce((s, r) => s + (parseFloat(r.total_price) || 0), 0);
    const totalExpenses = staffExpense + teacherExpense + purchaseExpense;

    return {
        label,
        from: start,
        to: end,
        subscriptions,
        staffPayments,
        teacherPayments,
        purchases,
        totals: {
            revenue,
            staffExpense,
            teacherExpense,
            purchaseExpense,
            totalExpenses,
            netProfit: revenue - totalExpenses
        }
    };
}

// month: 1-12 or 'all'
async function getDetailedReportData({ year, month }) {
    if (month === "all" || !month) {
        const periods = getYearPeriods(year);
        return Promise.all(periods.map(p => getPeriodData(p.start, p.end, p.label)));
    }
    const monthNum = parseInt(month, 10);
    const { start, end, label } = getPeriodRange(monthNum, year);
    return [await getPeriodData(start, end, label)];
}

module.exports = { getDetailedReportData };