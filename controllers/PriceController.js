const { body, validationResult } = require("express-validator");
const { ActivityLog, User } = require("../models");
const TuitionFee = require("../models/TuitionFee");
const SubjectPrice = require("../models/SubjectPrice");
const sequelize = require("../config/db");

const getUser = async (req) => {
    const userId = req.userId;
    return await User.findByPk(userId);
};

// Helper for activity logs
const createActivityLog = async (
    req,
    action,
    entityType,
    entityId,
    entityName,
    description
) => {
    const user = await getUser(req);

    await ActivityLog.create({
        action,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        description,
        user_name: `${user.name} ${user.last_name}`,
        user_role: user.role,
        user_id: user.id,
    });
};

exports.getPrices = async (req, res) => {
    try {
        const [tuition_fees, subject_prices] = await Promise.all([
            TuitionFee.findAll({ order: [["id", "ASC"]] }),
            SubjectPrice.findAll({ order: [["id", "ASC"]] }),
        ]);

        return res.status(200).json({
            message: "Prices retrieved successfully.",
            tuition_fees,
            subject_prices,
        });
    } catch (error) {
        console.error("Get prices error:", error);

        return res.status(500).json({
            message: "Server error.",
        });
    }
};

exports.updatePrices = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const { tuition_fees = [], subject_prices = [] } = req.body;

        for (const fee of tuition_fees) {
            const isBrother = !!fee.is_brother_amount;

            await TuitionFee.update(
                {
                    amount: Number(fee.amount) || 0,
                    is_brother_amount: isBrother,
                    brother_amount: isBrother ? Number(fee.brother_amount) || 0 : 0,
                },
                { where: { id: fee.id }, transaction: t }
            );
        }

        for (const item of subject_prices) {
            await SubjectPrice.update(
                { amount: Number(item.amount) || 0 },
                { where: { id: item.id }, transaction: t }
            );
        }

        await t.commit();

        return res.status(200).json({
            message: "Prices updated successfully.",
        });
    } catch (error) {
        await t.rollback();
        console.error("Update prices error:", error);

        return res.status(500).json({
            message: "Server error.",
        });
    }
};