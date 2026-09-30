const TeacherPayment = require("../models/TeacherPayment");
const Teacher = require("../models/Teacher");

// GET /teacher-payments
// GET /teacher-payments?month=8&year=2026
async function getTeacherPayments(req, res) {
    try {
        const { month, year, teacher_id, status } = req.query;

        const where = {};
        if (month) where.month = Number(month);
        if (year) where.year = Number(year);
        if (teacher_id) where.teacher_id = Number(teacher_id);
        if (status) where.status = status;

        const payments = await TeacherPayment.findAll({
            where,
            include: [{ model: Teacher, as: "paymentTeacher" }],
            order: [["year", "DESC"], ["month", "DESC"], ["id", "DESC"]]
        });
        res.json({ payments });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de la récupération des paiements" });
    }
}

// POST /teacher-payments
async function createTeacherPayment(req, res) {
    try {
        const { teacher_id, amount, status } = req.body;

        if (!teacher_id || !amount) {
            return res.status(400).json({ message: "teacher_id et amount sont requis" });
        }

        const payment = await TeacherPayment.create({
            teacher_id,
            amount,
            status: status || "en attente"
        });

        const full = await TeacherPayment.findByPk(payment.id, {
            include: [{ model: Teacher, as: "teacher" }]
        });

        res.status(201).json({ payment: full });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de la création du paiement" });
    }
}

// PATCH /teacher-payments/:id/pay
async function confirmTeacherPayment(req, res) {
    try {
        const { id } = req.params;

        const payment = await TeacherPayment.findByPk(id, {
            include: [{ model: Teacher, as: "paymentTeacher" }]
        });

        if (!payment) {
            return res.status(404).json({ message: "Paiement introuvable" });
        }

        if (payment.status !== "non payé") {
            return res.status(400).json({ message: "Ce paiement n'est pas encore payable (statut requis : no payé)." });
        }

        payment.status = "payé";
        await payment.save();

        res.json({ payment });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de la confirmation du paiement" });
    }
}

module.exports = { getTeacherPayments, createTeacherPayment, confirmTeacherPayment };