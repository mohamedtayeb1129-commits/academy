const { body, validationResult } = require("express-validator");
const SchoolYear = require("../models/SchoolYear");
const { createActivityLog } = require("../utils/createActivityLog");

exports.getAllSchoolYear = async (req, res) => {
    try {
        const schoolYears = await SchoolYear.findAll({
            order: [["start_date", "DESC"]],
        });

        res.status(200).json(schoolYears);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to fetch school years",
            error: error.message,
        });
    }
};

// POST /school-years
exports.createSchoolYear = [
    body("label")
        .trim()
        .notEmpty()
        .withMessage("School year label is required")
        .matches(/^\d{4}-\d{4}$/)
        .withMessage("School year label must be in the format YYYY-YYYY"),

    body("start_date")
        .notEmpty()
        .withMessage("Start date is required")
        .isISO8601()
        .withMessage("Start date must be a valid date"),

    body("end_date")
        .notEmpty()
        .withMessage("End date is required")
        .isISO8601()
        .withMessage("End date must be a valid date")
        .custom((endDate, { req }) => {
            if (
                req.body.start_date &&
                new Date(endDate) < new Date(req.body.start_date)
            ) {
                throw new Error(
                    "End date must be on or after the start date"
                );
            }

            return true;
        })
    ,async (req, res) => {
    try {

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                message: "Validation failed",
                errors: errors.array(),
            });
        }
        const { label, start_date, end_date } = req.body;


        const schoolYear = await SchoolYear.create({
            label,
            start_date,
            end_date,
        });

        await createActivityLog(
            req,
            "create",
            "school_year",
            schoolYear.id,
            schoolYear.label,
            `تمت إضافة السنة الدراسية ${schoolYear.label}`
        );

         res.status(201).json({
            message: "School year created successfully",
            schoolYear,
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to create school year",
            error: error.message,
        });
    }
}
]

// PUT /school-years/:id
exports.updateSchoolYear = async (req, res) => {
    try {
        const { id } = req.params;
        const { label, start_date, end_date } = req.body;

        const schoolYear = await SchoolYear.findByPk(id);

        if (!schoolYear) {
            return res.status(404).json({
                message: "السنة الدراسية غير موجودة",
            });
        }

        await schoolYear.update({
            label,
            start_date,
            end_date,
        });

        await createActivityLog(
            req,
            "update",
            "school_year",
            schoolYear.id,
            schoolYear.label,
            `تم تعديل السنة الدراسية ${schoolYear.label}`
        );

        res.status(200).json({
            message: "School year updated successfully",
            schoolYear,
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to create school year",
            error: error.message,
        });
    }
};

