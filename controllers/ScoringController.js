const { body, validationResult } = require("express-validator");
const Teacher = require("../models/Teacher");
const Scoring = require("../models/Scoring");



exports.createScoring = [
    body("noticed")
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 255 })
        .withMessage("Noticed must not exceed 255 characters."),

    body("sense")
        .notEmpty()
        .withMessage("Sense is required.")
        .isIn(["دخول", "خروج"])
        .withMessage("Invalid sense."),

    body("date")
        .notEmpty()
        .withMessage("Date is required.")
        .isISO8601()
        .withMessage("Invalid date."),

    body("time")
        .notEmpty()
        .withMessage("Time is required.")
        .matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/)
        .withMessage("Invalid time."),

    body("justification")
        .notEmpty()
        .withMessage("Justification is required.")
        .isBoolean()
        .withMessage("Justification must be true or false."),

    body("teacher_id")
        .notEmpty()
        .withMessage("Teacher ID is required.")
        .isInt()
        .withMessage("Invalid teacher ID."),

    async (req, res) => {
        try {
            const errors = validationResult(req);

            if (!errors.isEmpty()) {
                return res.status(400).json({
                    message: "Validation failed",
                    errors: errors.array(),
                });
            }

            const {
                noticed,
                sense,
                date,
                time,
                justification,
                teacher_id
            } = req.body;
            const teacher = await Teacher.findByPk(teacher_id);

            if (!teacher) {
                return res.status(404).json({
                    message: "Teacher not found."
                });
            }
            const scoring = await Scoring.create({
                noticed,
                sense,
                date,
                time,
                justification,
                teacher_id
            });

            return res.status(201).json({
                message: "Scoring added successfully.",
                scoring
            });

        } catch (error) {
            console.error("Create scoring error:", error);

            return res.status(500).json({
                message: "Server error."
            });
        }
    }
];

exports.getAllScoring = async (req, res) => {
    try {
        const scoring = await Scoring.findAll({
            include:[{
                model:Teacher,
                as:"scoringTeacher",
                attributes:["id","name","last_name"]
            }],
            order: [["createdAt", "DESC"]],
        });

        return res.status(200).json({
            message: "scoring retrieved successfully.",
            scoring,
        });

    } catch (error) {
        console.error("Get scoring error:", error);

        return res.status(500).json({
            message: "Server error.",
        });
    }
};