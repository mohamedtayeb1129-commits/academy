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
const SubjectPrice = require("../models/SubjectPrice");
const getUser = async (req) => {
  const userId = req.userId;
  const user = await User.findByPk(userId);
  return user;
};


const round3 = (n) => Math.round(n * 1000) / 1000; 

const cleanPhone = (v) => (typeof v === "string" ? v.replace(/\s/g, "") : v);

const phoneRule = (field, message) =>
  body(field)
    .optional({ checkFalsy: true })
    .customSanitizer(cleanPhone)
    .trim()
    .matches(/^\d{8}$/)
    .withMessage(message);

exports.createStudent = [
  body("name").trim().notEmpty().withMessage("Name is required."),

  body("last_name").trim().notEmpty().withMessage("Last name is required."),

  body("father_name").optional().trim(),

  body("mother_name").optional().trim(),

  phoneRule("father_phone", "Invalid father phone number."),
  phoneRule("mother_phone", "Invalid mother phone number."),
  phoneRule("phone", "Invalid phone number."),

  body("stage").trim().notEmpty().withMessage("Stage is required."),

  body("level").trim().notEmpty().withMessage("Level is required."),

  body("subscription_type")
    .isIn(["by_subject", "monthly"])
    .withMessage("Invalid subscription type."),

  body("has_sibling").optional().isBoolean().toBoolean(),

  // materials are only required for a per-subject subscription
  body("materials")
    .if(body("subscription_type").equals("by_subject"))
    .isArray({ min: 1 })
    .withMessage("materials must be a non-empty array."),

  async (req, res) => {
    let t;
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
        subscription_type,
        has_sibling = false,
        materials = [],
      } = req.body;

      const isBySubject = subscription_type === "by_subject";

      const stageChoosing =
        stage === "ثانوي" && level === "باكالوريا" ? "باكالوريا" : stage;

      // by_subject -> SubjectPrice (price per subject)
      // monthly    -> Price (flat monthly price)
      const PriceModel = isBySubject ? SubjectPrice : Price;

      const price = await PriceModel.findOne({
        where: { label: stageChoosing },
      });

      if (!price) {
        return res.status(400).json({
          message: "No price found for this class and subscription type.",
        });
      }

      const schoolYear = await SchoolYear.findOne({
        where: { status: "active" },
        order: [["start_date", "DESC"]],
      });

      if (!schoolYear) {
        return res.status(400).json({
          message: "No active school year.",
        });
      }

      // Sibling -> brother_amount, otherwise -> base amount
      const useBrotherAmount =
        has_sibling && price.is_brother_amount && price.brother_amount != null;

      const unitPrice = useBrotherAmount ? price.brother_amount : price.amount;

      // Final amount, computed once and stored as a snapshot
      const totalAmount = round3(
        isBySubject ? unitPrice * materials.length : unitPrice
      );

      t = await sequelize.transaction();

      const student = await Student.create(
        {
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
        },
        { transaction: t }
      );

      const subscription = await Subscription.create(
        {
          amount: totalAmount,
          subscription_type,
          has_sibling_discount: useBrotherAmount,
          student_id: student.id,
          school_year_id: schoolYear.id,
        },
        { transaction: t }
      );

      await Payment.create(
        {
          amount: totalAmount,
          status: "payé",
          subscription_id: subscription.id,
        },
        { transaction: t }
      );

      if (isBySubject) {
        await StudentSubject.bulkCreate(
          materials.map((material) => ({
            label: material,
            student_id: student.id,
          })),
          { transaction: t }
        );
      }

      await Enrollment.create(
        { student_id: student.id, school_year_id: schoolYear.id },
        { transaction: t }
      );

      await ActivityLog.create(
        {
          action: "create",
          entity_type: "student",
          entity_id: student.id,
          entity_name: `${student.name} ${student.last_name}`,
          description: `تمت إضافة التلميذ ${student.name} ${student.last_name}`,
          user_name: `${user.name} ${user.last_name}`,
          user_role: user.role,
          user_id: user.id,
        },
        { transaction: t }
      );

      await t.commit();

      return res.status(201).json({
        message: "Student added successfully.",
        student,
        subscription,
      });
    } catch (error) {
      if (t) await t.rollback();
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
          model:StudentSubject,
          as:"subjects"
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
    await Subscription.update({is_active:false},{where:{student_id:student.id}})

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

  phoneRule("father_phone", "Invalid father phone number."),
  phoneRule("mother_phone", "Invalid mother phone number."),
  phoneRule("phone", "Invalid phone number."),

  body("stage").trim().notEmpty().withMessage("Stage is required."),

  body("level").trim().notEmpty().withMessage("Level is required."),

  body("subscription_type")
    .isIn(["by_subject", "monthly"])
    .withMessage("Invalid subscription type."),

  body("has_sibling").optional().isBoolean().toBoolean(),

  // materials are only required for a per-subject subscription
  body("materials")
    .if(body("subscription_type").equals("by_subject"))
    .isArray({ min: 1 })
    .withMessage("materials must be a non-empty array."),

  async (req, res) => {
    let t;
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
        subscription_type,
        has_sibling = false,
        materials = [],
      } = req.body;

      const { id } = req.params;

      const student = await Student.findByPk(id);

      if (!student) {
        return res.status(404).json({
          message: "Student not found.",
        });
      }

      const isBySubject = subscription_type === "by_subject";

      const stageChoosing =
        stage === "ثانوي" && level === "باكالوريا" ? "باكالوريا" : stage;

      // by_subject -> SubjectPrice (price per subject)
      // monthly    -> Price (flat monthly price)
      const PriceModel = isBySubject ? SubjectPrice : Price;

      const price = await PriceModel.findOne({
        where: { label: stageChoosing },
      });

      if (!price) {
        return res.status(400).json({
          message: "No price found for this class and subscription type.",
        });
      }

      const schoolYear = await SchoolYear.findOne({
        where: { status: "active" },
        order: [["start_date", "DESC"]],
      });

      if (!schoolYear) {
        return res.status(400).json({
          message: "No active school year.",
        });
      }

      // Sibling -> brother_amount, otherwise -> base amount
      const useBrotherAmount =
        has_sibling && price.is_brother_amount && price.brother_amount != null;

      const unitPrice = useBrotherAmount ? price.brother_amount : price.amount;

      // Final amount, recomputed and stored as a snapshot
      const totalAmount = round3(
        isBySubject ? unitPrice * materials.length : unitPrice
      );

      t = await sequelize.transaction();

      await student.update(
        {
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
        },
        { transaction: t }
      );

      // Subscription of the active school year
      let subscription = await Subscription.findOne({
        where: { student_id: student.id, school_year_id: schoolYear.id },
        transaction: t,
      });

      if (subscription) {
        await subscription.update(
          {
            amount: totalAmount,
            subscription_type,
            has_sibling_discount: useBrotherAmount,
          },
          { transaction: t }
        );

        // Keep the initial payment in sync with the new amount
        const payment = await Payment.findOne({
          where: { subscription_id: subscription.id },
          order: [["createdAt", "ASC"]],
          transaction: t,
        });

        if (payment) {
          await payment.update({ amount: totalAmount }, { transaction: t });
        } else {
          await Payment.create(
            {
              amount: totalAmount,
              status: "payé",
              subscription_id: subscription.id,
            },
            { transaction: t }
          );
        }
      } else {
        subscription = await Subscription.create(
          {
            amount: totalAmount,
            subscription_type,
            has_sibling_discount: useBrotherAmount,
            student_id: student.id,
            school_year_id: schoolYear.id,
          },
          { transaction: t }
        );

        await Payment.create(
          {
            amount: totalAmount,
            status: "payé",
            subscription_id: subscription.id,
          },
          { transaction: t }
        );
      }

      // Replace subjects
      await StudentSubject.destroy({
        where: { student_id: student.id },
        transaction: t,
      });

      if (isBySubject) {
        await StudentSubject.bulkCreate(
          materials.map((material) => ({
            label: material,
            student_id: student.id,
          })),
          { transaction: t }
        );
      }

      // Make sure the student is enrolled in the active year
      await Enrollment.findOrCreate({
        where: { student_id: student.id, school_year_id: schoolYear.id },
        defaults: { student_id: student.id, school_year_id: schoolYear.id },
        transaction: t,
      });

      await ActivityLog.create(
        {
          action: "update",
          entity_type: "student",
          entity_id: student.id,
          entity_name: `${student.name} ${student.last_name}`,
          description: `تم تعديل بيانات التلميذ ${student.name} ${student.last_name}`,
          user_name: `${user.name} ${user.last_name}`,
          user_role: user.role,
          user_id: user.id,
        },
        { transaction: t }
      );

      await t.commit();

      return res.status(200).json({
        message: "Student updated successfully.",
        student,
        subscription,
      });
    } catch (error) {
      if (t) await t.rollback();
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
