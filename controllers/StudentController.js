const { validationResult, body, query } = require("express-validator");
const Student = require("../models/Student");
const { Subscription, Package, StudentPackage, PackageSubject } = require("../models");
const Price = require("../models/TuitionFee");
const { Op, fn, col, where } = require("sequelize");
const ActivityLog = require("../models/ActivityLog");
const User = require("../models/Users");
const StudentSubject = require("../models/StudentSubject");
const Payment = require("../models/Payment");
const Enrollment = require("../models/Enrollment");
const SchoolYear = require("../models/SchoolYear");
const sequelize = require("../config/db");
const getUser = async (req) => {
  const userId = req.userId;
  const user = await User.findByPk(userId);
  return user;
};

exports.createStudent = [
  body("name").trim().notEmpty().withMessage("Name is required."),

  body("last_name").trim().notEmpty().withMessage("Last name is required."),

  body("father_name").optional().trim(),

  body("mother_name").optional().trim(),

  body("father_phone")
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\d{8}$/)
    .withMessage("Invalid father phone number."),

  body("mother_phone")
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\d{8}$/)
    .withMessage("Invalid mother phone number."),
  body("level").trim().notEmpty().withMessage("Level is required."),

  body("materials")
    .notEmpty()
    .withMessage("materials is required.")
    .isArray({ min: 1 })
    .withMessage("materials must be a non-empty array."),

  async (req, res) => {
    try {
      const user = await getUser(req);

      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const {
        name,
        last_name,
        father_name,
        mother_name,
        father_phone,
        mother_phone,
        level,
        stage,
        section,
        phone,
        materials,
      } = req.body;

      const stageChoosing =
        stage === "ثانوي" && level === "باكالوريا" ? "باكالوريا" : stage;

      const price = await Price.findOne({ where: { label: stageChoosing } });

      if (!price) {
        return res.status(400).json({
          message: "That class does not exist.",
        });
      }

      const schoolYear = await SchoolYear.findOne({
          where: {
            status: "active",
          },
          order: [["start_date", "DESC"]],
        });

      const totalAmount = price.amount * materials.length;
      const student = await Student.create({
        name,
        last_name,
        father_name,
        mother_name,
        father_phone,
        mother_phone,
        level,
        section,
        phone,
        stage,
      });
      const subscription = await Subscription.create({
        amount: totalAmount,
        student_id: student.id,
        school_year_id:schoolYear.id
      });
      await Payment.create({
        amount:totalAmount,
        status:"payé",
        subscription_id:subscription.id
      })

      for (const material of materials) {
        await StudentSubject.create({
          label: material,
          student_id: student.id,
        });
      }
      
      await Enrollment.create({student_id:student.id,school_year_id:schoolYear.id})

      await ActivityLog.create({
        action: "create",
        entity_type: "student",
        entity_id: student.id,
        entity_name: `${student.name} ${student.last_name}`,
        description: `تمت إضافة التلميذ ${student.name} ${student.last_name}`,
        user_name: `${user.name} ${user.last_name}`,
        user_role: user.role,
        user_id: user.id,
      });

      return res.status(201).json({
        message: "Student added successfully.",
        student,
      });
    } catch (error) {
      console.error("Create student error:", error);

      return res.status(500).json({
        message: "Server error.",
      });
    }
  },
];

exports.getAllStudents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 8,
      search = "",
      level = "",
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 8, 1);
    const offset = (pageNum - 1) * limitNum;

    const whereClause = {
      is_deleted: false,
    };

    if (level) {
      whereClause.level = level;
    }

    const andConditions = [];

    if (search.trim()) {
      andConditions.push(
        where(
          fn(
            "concat",
            col("students.name"),
            " ",
            col("students.last_name"),
            " ",
            col("students.level")
          ),
          {
            [Op.like]: `%${search.trim()}%`,
          }
        )
      );
    }

    if (andConditions.length) {
      whereClause[Op.and] = andConditions;
    }

    // Get active school year
    const currentSchoolYear = await SchoolYear.findOne({
      where: {
        status: "active",
      },
      order: [["start_date", "DESC"]],
    });

    if (!currentSchoolYear) {
      return res.status(400).json({
        message: "No active school year found.",
      });
    }

    const {
      rows: students,
      count: total,
    } = await Student.findAndCountAll({
      order: [["createdAt", "DESC"]],
      where: whereClause,

      include: [
        {
          model: Subscription,
          as: "subscription",

          // Only get subscription for current school year
          where: {
            school_year_id: currentSchoolYear.id,
          },

          required: false,
        },

        {
          model: StudentPackage,
          as: "studentPackage",
          attributes: ["id", "package_id"],

          include: [
            {
              model: Package,
              as: "packageStudentPackage",

              include: [
                {
                  model: PackageSubject,
                  as: "packageSubject",
                },
              ],
            },
          ],
        },
      ],

      limit: limitNum,
      offset,
      distinct: true,
    });

    // Add frontend-friendly information
    const formattedStudents = students.map((student) => {
      const studentData = student.toJSON();

      return {
        ...studentData,

        current_school_year: currentSchoolYear.label,

        // Student has a subscription for the current school year
        is_registered_current_year: !!studentData.subscription,

        // Can register only if there is no current-year subscription
        can_reregister: !studentData.subscription,
      };
    });

    return res.status(200).json({
      message: "Students retrieved successfully.",

      schoolYear: {
        id: currentSchoolYear.id,
        label: currentSchoolYear.label,
      },

      students: formattedStudents,

      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Get students error:", error);

    return res.status(500).json({
      message: "Server error.",
    });
  }
};

exports.deleteStudents = async (req, res) => {
  try {
    const user = await getUser(req);
    const { id } = req.params;
    const student = await Student.findByPk(id);
    if (!student) {
      return res.status(404).json({
        message: "Student not found.",
      });
    }
    student.update({ is_deleted: true });

    await ActivityLog.create({
      action: "delete",
      entity_type: "student",
      entity_id: student.id,
      entity_name: `${student.name} ${student.last_name}`,
      description: `تم حذف التلميذ ${student.name} ${student.last_name}`,
      user_name: `${user.name} ${user.last_name}`,
      user_role: user.role,
      user_id: user.id,
    });

    return res.status(200).json({
      message: "Student deleted.",
    });
  } catch (error) {
    console.error("Get students error:", error);

    return res.status(500).json({
      message: "Server error.",
    });
  }
};

exports.updateStudent = [
  body("name").trim().notEmpty().withMessage("Name is required."),

  body("last_name").trim().notEmpty().withMessage("Last name is required."),

  body("father_name").optional().trim(),

  body("mother_name").optional().trim(),

  body("father_phone")
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\d{8}$/)
    .withMessage("Invalid father phone number."),

  body("mother_phone")
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\d{8}$/)
    .withMessage("Invalid mother phone number."),

  body("gender").isIn(["بنت", "ولد"]).withMessage("Gender must be M or F."),

  body("birthday")
    .notEmpty()
    .withMessage("Date of birth is required.")
    .isISO8601()
    .withMessage("Invalid date of birth."),

  body("classe").trim().notEmpty().withMessage("Class is required."),

  body("address").trim().notEmpty().withMessage("Address is required."),

  async (req, res) => {
    try {
      const user = await getUser(req);

      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const {
        name,
        last_name,
        father_name,
        mother_name,
        father_phone,
        mother_phone,
        address,
        classe,
        gender,
        birthday,
        unique_id,
        transport,
        is_take_book,
        is_take_uniform,
      } = req.body;

      const { id } = req.params;

      // Find student
      const student = await Student.findByPk(id);

      if (!student) {
        return res.status(404).json({
          message: "Student not found.",
        });
      }

      if (unique_id) {
        const studentUnique = await Student.findOne({
          where: {
            unique_id,
            id: { [Op.ne]: id },
          },
        });

        if (studentUnique) {
          return res.status(400).json({
            message: "Unique ID already exists.",
          });
        }
      }

      // Check class price
      const price = await Price.findOne({
        where: {
          label: classe,
        },
      });

      if (!price) {
        return res.status(400).json({
          message: "That class does not exist.",
        });
      }

      // Convert values to boolean
      const toBool = (v) => v === true || v === "true";

      const transportBool = toBool(transport);
      const bookBool = toBool(is_take_book);
      const uniformBool = toBool(is_take_uniform);

      const totalPrice =
        (parseFloat(price.amount) +
          (bookBool ? 10 : 0) +
          (transportBool ? 10 : 0) +
          (uniformBool ? 10 : 0)) /
        2;

      await student.update({
        name,
        last_name,
        father_name,
        mother_name,
        father_phone,
        mother_phone,
        gender,
        birthday,
        unique_id,
        class: classe,
        address,
      });

      // Find existing subscription
      const subscription = await Subscription.findOne({
        where: {
          student_id: student.id,
        },
      });

      if (subscription) {
        // Update existing
        await subscription.update({
          amount: totalPrice,
          transport: transportBool,
          is_take_book: bookBool,
          is_take_uniform: uniformBool,
        });
      } else {
        // Create if student doesn't have one
        await Subscription.create({
          amount: totalPrice,
          student_id: student.id,
          transport: transportBool,
          is_take_book: bookBool,
          is_take_uniform: uniformBool,
        });
      }

      await ActivityLog.create({
        action: "update",
        entity_type: "student",
        entity_id: student.id,
        entity_name: `${student.name} ${student.last_name}`,
        description: `تم تعديل بيانات التلميذ ${student.name} ${student.last_name}`,
        user_name: `${user.name} ${user.last_name}`,
        user_role: user.role,
        user_id: user.id,
      });

      return res.status(200).json({
        message: "Student updated successfully.",
        student,
      });
    } catch (error) {
      console.error("Update student error:", error);

      return res.status(500).json({
        message: "Server error.",
      });
    }
  },
];

const STAGE_LEVELS = {
  "ابتدائي": [
    "السنة الأولى ابتدائي",
    "السنة الثانية ابتدائي",
    "السنة الثالثة ابتدائي",
    "السنة الرابعة ابتدائي",
    "السنة الخامسة ابتدائي",
    "السنة السادسة ابتدائي",
  ],
  "اعدادي": [
    "السنة السابعة اعدادي",
    "السنة الثامنة اعدادي",
    "السنة التاسعة اعدادي",
  ],
  "ثانوي": [
    "السنة الأولى ثانوي",
    "السنة الثانية ثانوي",
    "السنة الثالثة ثانوي",
    "باكالوريا",
  ],
};
 
// Flat ordered list: [{ level, stage }, ...] from first year to Bac
const LEVEL_ORDER = Object.entries(STAGE_LEVELS).flatMap(([stage, levels]) =>
  levels.map((level) => ({ level, stage }))
);
 
// Next level (and its stage) for a student who passed.
// Returns null when there is no next level (Bac, or unknown level).
const getNextLevel = (level) => {
  const i = LEVEL_ORDER.findIndex((l) => l.level === level);
  return i !== -1 && i < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[i + 1] : null;
};
 
// Only Bac students can change their subscription
const isBacLevel = (level) => level === "باكالوريا";
 

exports.reenrollStudent = async (req, res) => {
  const { studentId, result, keepSameSubscription, subscription, schoolYearId } =
    req.body;
 
  // ---------- validation ----------
  if (!studentId) {
    return res.status(400).json({ message: "studentId is required" });
  }
  if (!["ناجح", "راسب"].includes(result)) {
    return res.status(400).json({ message: "result must be 'ناجح' or 'راسب'" });
  }
  if (typeof keepSameSubscription !== "boolean") {
    return res
      .status(400)
      .json({ message: "keepSameSubscription must be a boolean" });
  }
  if (keepSameSubscription === false) {
    const amount = Number(subscription?.amount);
    if (!subscription || Number.isNaN(amount) || amount < 0) {
      return res.status(400).json({ message: "A valid subscription.amount is required" });
    }
  }
 
  const t = await sequelize.transaction();
  try {
    // ---------- student ----------
    const student = await Student.findOne({
      where: { id: studentId, is_deleted: false },
      transaction: t,
    });
    if (!student) {
      await t.rollback();
      return res.status(404).json({ message: "Student not found" });
    }
 
    if (keepSameSubscription === false && !isBacLevel(student.level)) {
      await t.rollback();
      return res
        .status(403)
        .json({ message: "Only Bac students can change their subscription" });
    }
 
    // ---------- target school year ----------
    const nextYear = schoolYearId
      ? await SchoolYear.findByPk(schoolYearId, { transaction: t })
      : await SchoolYear.findOne({ order: [["id", "DESC"]], transaction: t });
    if (!nextYear) {
      await t.rollback();
      return res.status(404).json({ message: "School year not found" });
    }
 
    // ---------- already enrolled in that year? ----------
    const alreadyEnrolled = await Enrollment.findOne({
      where: { student_id: student.id, school_year_id: nextYear.id },
      transaction: t,
    });
    if (alreadyEnrolled) {
      await t.rollback();
      return res
        .status(409)
        .json({ message: "Student is already enrolled in this school year" });
    }
 
    // ---------- previous subscription (latest one) ----------
    const previousSubscription = await Subscription.findOne({
      where: { student_id: student.id },
      order: [["id", "DESC"]],
      transaction: t,
    });
 
    // ---------- close current enrollment / subscription ----------
    await Enrollment.update(
      { is_active: false },
      { where: { student_id: student.id, is_active: true }, transaction: t }
    );
    if (previousSubscription) {
      await previousSubscription.update({ is_active: false }, { transaction: t });
    }
 
    // ---------- promote / keep level ----------
    if (result === "ناجح") {
      const next = getNextLevel(student.level);
      if (next) {
        // stage changes automatically when moving to a new stage (e.g. ابتدائي -> اعدادي)
        await student.update(
          { level: next.level, stage: next.stage },
          { transaction: t }
        );
      }
    }
 
    // ---------- new enrollment ----------
    const enrollment = await Enrollment.create(
      {
        student_id: student.id,
        school_year_id: nextYear.id,
        is_active: true,
        status: "reregistered",
      },
      { transaction: t }
    );
 
    // ---------- new subscription ----------
    let newSubscription;
    if (keepSameSubscription) {
      newSubscription = await Subscription.create(
        {
          student_id: student.id,
          school_year_id: nextYear.id,
          amount: previousSubscription?.amount ?? 0,
          is_offer: previousSubscription?.is_offer ?? false,
          status: "en attente", // ASSUMPTION: new year is not paid yet
          is_active: true,
        },
        { transaction: t }
      );
    } else {
      const hasNewPackage = Boolean(subscription.package_id);
      newSubscription = await Subscription.create(
        {
          student_id: student.id,
          school_year_id: nextYear.id,
          amount: Number(subscription.amount),
          // picking a package means the student has an offer
          is_offer: hasNewPackage ? true : Boolean(subscription.is_offer),
          status: "en attente",
          is_active: true,
        },
        { transaction: t }
      );
 
      // replace the student's package with the new one
      if (hasNewPackage) {
        await StudentPackage.destroy({
          where: { student_id: student.id },
          transaction: t,
        });
        await StudentPackage.create(
          { student_id: student.id, package_id: subscription.package_id },
          { transaction: t }
        );
      }
    }
 
    await t.commit();
    return res.status(201).json({
      message: "Student re-enrolled successfully",
      student,
      enrollment,
      subscription: newSubscription,
    });
  } catch (err) {
    await t.rollback();
    console.error("reenrollStudent error:", err);
    return res.status(500).json({ message: "Server error while re-enrolling student" });
  }
};

exports.createOfferStudent = [
  body("name").trim().notEmpty().withMessage("Name is required."),

  body("last_name").trim().notEmpty().withMessage("Last name is required."),

  body("phone").trim().notEmpty().withMessage("Phone number is required."),

  body("level").trim().notEmpty().withMessage("Level is required."),

  body("package_id").notEmpty().withMessage("materials is required."),

  async (req, res) => {
    try {
      const user = await getUser(req);

      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { name, last_name, phone, level, stage, section, package_id } =
        req.body;

      const price = await Price.findOne({ where: { label: "باكالوريا" } });

      if (!price) {
        return res.status(400).json({
          message: "That class does not exist.",
        });
      }

      const package = await Package.findByPk(package_id);

      if (!package) {
        return res.status(400).json({
          message: "That package does not exist.",
        });
      }

      const student = await Student.create({
        name,
        last_name,
        phone,
        level,
        section,
        stage,
      });
      StudentPackage.create({ student_id: student.id, package_id: package_id });
      await Subscription.create({
        amount: package.amount,
        is_offer: true,
        student_id: student.id,
      });

      await ActivityLog.create({
        action: "create",
        entity_type: "student",
        entity_id: student.id,
        entity_name: `${student.name} ${student.last_name}`,
        description: `تمت إضافة التلميذ ${student.name} ${student.last_name}`,
        user_name: `${user.name} ${user.last_name}`,
        user_role: user.role,
        user_id: user.id,
      });

      return res.status(201).json({
        message: "Student added successfully.",
        student,
      });
    } catch (error) {
      console.error("Create student error:", error);

      return res.status(500).json({
        message: "Server error.",
      });
    }
  },
];
