const { body, validationResult } = require("express-validator");
const Price = require("../models/TuitionFee");
const { ActivityLog, User } = require("../models");

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
        const price = await Price.findAll({
            order: [["id", "ASC"]],

        });


        return res.status(200).json({
            message: "Absence students retrieved successfully.",
            price,
        });

    } catch (error) {
        console.error("Get student absences error:", error);

        return res.status(500).json({
            message: "Server error.",
        });
    }
};


exports.updateTuitionFee = [
    body("amount")
        .optional()
        .isFloat({ gt: 0 })
        .withMessage("يجب أن يكون المعلوم رقمًا أكبر من صفر."),

    body("label")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("اسم المستوى مطلوب."),

    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array()
            });
        }

        try {
            const { id } = req.params;
            const { label, amount } = req.body;

            const tuitionFee = await Price.findByPk(id);

            if (!tuitionFee) {
                return res.status(404).json({
                    message: "المعلوم غير موجود.",
                });
            }

            // Keep old values
            const oldLabel = tuitionFee.label;
            const oldAmount = tuitionFee.amount;

            if (label !== undefined) {
                tuitionFee.label = label;
            }

            if (amount !== undefined) {
                tuitionFee.amount = amount;
            }

            await tuitionFee.save();

            // Activity log
            await createActivityLog(
                req,
                "update",
                "tuition_fee",
                tuitionFee.id,
                tuitionFee.label,
                `تم تعديل المعلوم ${oldLabel} - المبلغ: ${oldAmount} → ${tuitionFee.amount}`
            );

            return res.status(200).json({
                message: "تم تحديث المعلوم بنجاح.",
                tuitionFee,
            });

        } catch (error) {
            console.error("Update tuition fee error:", error);

            return res.status(500).json({
                message: "حدث خطأ أثناء تحديث المعلوم.",
            });
        }
    }
];