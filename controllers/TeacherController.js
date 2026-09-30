const { validationResult, body } = require("express-validator");
const Teacher = require("../models/Teacher");
const Subject = require("../models/Subject");
const { TeacherPayment } = require("../models");
const sequelize = require("../config/db");
const ActivityLog = require("../models/ActivityLog");
const User = require("../models/Users");


const getUser = async (req) => {
        const userId = req.userId;
        const user = await User.findByPk(userId);
        return user
}

exports.createTeacher = [
    body("name")
        .trim()
        .notEmpty()
        .withMessage("Name is required."),

    body("last_name")
        .trim()
        .notEmpty()
        .withMessage("Last name is required."),

    body("cin")
        .notEmpty()
        .withMessage("CIN is required.")
        .trim()
        .matches(/^\d{8}$/)
        .withMessage("Invalid CIN. CIN must contain exactly 8 digits."),

    body("phone")
        .optional({ checkFalsy: true })
        .trim()
        .matches(/^\d{8}$/)
        .withMessage("Invalid phone number."),

    body("price_by_hour")
        .notEmpty()
        .withMessage("price_by_hour is required.")
        .isNumeric()
        .withMessage("price_by_hour must be a number.")
        .custom((value) => {
            if (Number(value) < 0) {
                throw new Error("price_by_hour cannot be negative.");
            }
            return true;
        }),

    body("status")
        .isIn(["نشط", "في إجازة", "غير نشط"])
        .withMessage("Invalid teacher status."),

    body("matieres")
        .notEmpty()
        .withMessage("matieres is required.")
        .isArray({ min: 1 })
        .withMessage("matieres must be a non-empty array."),

    async (req, res) => {
        try {
            const errors = validationResult(req);
            const user = await getUser(req);

            if (!errors.isEmpty()) {
                return res.status(400).json({
                    message: "Validation failed",
                    errors: errors.array(),
                });
            }

            const {
                name,
                last_name,
                cin,
                phone,
                price_by_hour,
                status,
                matieres,
            } = req.body;

            // Check if CIN already exists
            const existingTeacher = await Teacher.findOne({
                where: { cin },
            });

            if (existingTeacher) {
                return res.status(400).json({
                    message: "CIN already exists.",
                });
            }

            // Create teacher
            const teacher = await Teacher.create({
                name,
                cin,
                last_name,
                phone,
                price_by_hour,
                status,
            });

            // Create subjects
            for (const matiere of matieres) {
                await Subject.create({
                    label: matiere,
                    teacher_id: teacher.id,
                });
            }

            // Activity log
            await ActivityLog.create({
                action: "create",
                entity_type: "teacher",
                entity_id: teacher.id,
                entity_name: `${teacher.name} ${teacher.last_name}`,
                description: `تمت إضافة الأستاذ ${teacher.name} ${teacher.last_name}`,
                user_name: `${user.name} ${user.last_name}`,
                user_role: user.role,
                user_id: user.id,
            });

            return res.status(201).json({
                message: "Teacher added successfully.",
                teacher,
            });

        } catch (error) {
            console.error("Create teacher error:", error);

            return res.status(500).json({
                message: "Server error.",
            });
        }
    },
];

exports.getAllTeacher = async (req, res) => {
    try {
        const teachers = await Teacher.findAll({
            order: [["createdAt", "DESC"]],
            where:{is_deleted:false},
            include:[
                {
                    model:Subject,
                    as:"subject",
                    attributes:["label"]
                }
            ]
        });

        return res.status(200).json({
            message: "teachers retrieved successfully.",
            teachers,
        });

    } catch (error) {
        console.error("Get teachers error:", error);

        return res.status(500).json({
            message: "Server error.",
        });
    }
};


exports.deleteTeacher = async (req, res) => {
    try {
        const { id } = req.params;

        const teacher = await Teacher.findByPk(id);

        if (!teacher) {
            return res.status(404).json({
                message: "Teacher not found.",
            });
        }

        const user = await getUser(req);

        // Soft delete
        await teacher.update({
            is_deleted: true,
        });

        // Activity log
        await ActivityLog.create({
            action: "delete",
            entity_type: "teacher",
            entity_id: teacher.id,
            entity_name: `${teacher.name} ${teacher.last_name}`,
            description: `تم حذف الأستاذ ${teacher.name} ${teacher.last_name}`,
            user_name: `${user.name} ${user.last_name}`,
            user_role: user.role,
            user_id: user.id,
        });

        return res.status(200).json({
            message: "Teacher deleted successfully.",
        });

    } catch (error) {
        console.error("Delete teacher error:", error);

        return res.status(500).json({
            message: "Server error.",
        });
    }
};



exports.updateTeacher = [
    body("name")
        .trim()
        .notEmpty()
        .withMessage("Name is required."),

    body("last_name")
        .trim()
        .notEmpty()
        .withMessage("Last name is required."),

    body("phone")
        .optional({ checkFalsy: true })
        .trim()
        .matches(/^\d{8}$/)
        .withMessage("Invalid phone number."),

    body("price_by_hour")
        .notEmpty()
        .withMessage("price_by_hour is required.")
        .isNumeric()
        .withMessage("price_by_hour must be a number.")
        .custom((value) => {
            if (Number(value) < 0) {
                throw new Error("price_by_hour cannot be negative.");
            }
            return true;
        }),

    body("status")
        .isIn(["نشط", "في إجازة", "غير نشط"])
        .withMessage("Invalid teacher status."),

    body("matieres")
        .isArray({ min: 1 })
        .withMessage("matieres must contain at least one subject."),

    body("matieres.*")
        .trim()
        .notEmpty()
        .withMessage("Subject cannot be empty."),

    async (req, res) => {
        const transaction = await sequelize.transaction();

        try {
            const errors = validationResult(req);

            if (!errors.isEmpty()) {
                await transaction.rollback();

                return res.status(400).json({
                    message: "Validation failed",
                    errors: errors.array(),
                });
            }

            const { id } = req.params;

            const {
                name,
                last_name,
                phone,
                price_by_hour,
                status,
                matieres,
            } = req.body;

            // Get current user
            const user = await getUser(req);

            // Find teacher
            const teacher = await Teacher.findByPk(id, {
                transaction,
            });

            if (!teacher) {
                await transaction.rollback();

                return res.status(404).json({
                    message: "Teacher not found.",
                });
            }

            // Update teacher
            await teacher.update(
                {
                    name,
                    last_name,
                    phone,
                    price_by_hour,
                    status,
                },
                {
                    transaction,
                }
            );

            // Delete old subjects
            await Subject.destroy({
                where: {
                    teacher_id: teacher.id,
                },
                transaction,
            });

            // Create new subjects
            await Subject.bulkCreate(
                matieres.map((matiere) => ({
                    label: matiere,
                    teacher_id: teacher.id,
                })),
                {
                    transaction,
                }
            );

            // Activity log
            await ActivityLog.create(
                {
                    action: "update",
                    entity_type: "teacher",
                    entity_id: teacher.id,
                    entity_name: `${teacher.name} ${teacher.last_name}`,
                    description: `تم تعديل معلومات الأستاذ ${teacher.name} ${teacher.last_name}`,
                    user_name: `${user.name} ${user.last_name}`,
                    user_role: user.role,
                    user_id: user.id,
                },
                {
                    transaction,
                }
            );

            // Everything succeeded
            await transaction.commit();

            return res.status(200).json({
                message: "Teacher updated successfully.",
                teacher,
            });

        } catch (error) {
            // Rollback everything if something fails
            await transaction.rollback();

            console.error("Update teacher error:", error);

            return res.status(500).json({
                message: "Server error.",
            });
        }
    },
];
