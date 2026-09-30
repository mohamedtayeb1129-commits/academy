const { validationResult, body } = require('express-validator');
const SchoolBreak = require('../models/SchoolBreak');
const SchoolYear = require('../models/SchoolYear');

// GET /school-break
exports.getAll = async (req, res) => {
  try {
    const breaks = await SchoolBreak.findAll({
      order: [['start_date', 'ASC']],
    });
    res.json(breaks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب العطل' });
  }
};

// GET /school-break/:id
exports.getOne = async (req, res) => {
  try {
    const schoolBreak = await SchoolBreak.findByPk(req.params.id);
    if (!schoolBreak) {
      return res.status(404).json({ message: 'العطلة غير موجودة' });
    }
    res.json(schoolBreak);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب العطلة' });
  }
};

// POST /school-break
exports.create = [
      body('school_year_id').notEmpty().withMessage('السنة الدراسية مطلوبة'),
      body('label').trim().notEmpty().withMessage('اسم العطلة مطلوب'),
      body('start_date').isISO8601().withMessage('تاريخ البداية غير صالح'),
      body('end_date').isISO8601().withMessage('تاريخ النهاية غير صالح'),
      body('type')
        .isIn(['summer', 'exceptional'])
        .withMessage('نوع العطلة غير صالح'),
    async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  }

  try {
    const { school_year_id, label, start_date, end_date, type } = req.body;

    const schoolYear = await SchoolYear.findByPk(school_year_id);
    if (!schoolYear) {
      return res.status(404).json({ message: 'السنة الدراسية غير موجودة' });
    }

    if (start_date < schoolYear.start_date || end_date > schoolYear.end_date) {
      return res.status(400).json({ message: 'تاريخ العطلة خارج نطاق السنة الدراسية' });
    }

    if (end_date < start_date) {
      return res.status(400).json({ message: 'يجب أن يكون تاريخ النهاية بعد تاريخ البداية' });
    }

    const schoolBreak = await SchoolBreak.create({
      school_year_id,
      label,
      start_date,
      end_date,
      type,
    });

    res.status(201).json({ message: 'تم إضافة العطلة بنجاح', schoolBreak });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'حدث خطأ أثناء إضافة العطلة' });
  }
}
]

// PUT /school-break/:id
exports.update = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  }

  try {
    const schoolBreak = await SchoolBreak.findByPk(req.params.id);
    if (!schoolBreak) {
      return res.status(404).json({ message: 'العطلة غير موجودة' });
    }

    const { school_year_id, label, start_date, end_date, type } = req.body;

    const targetYearId = school_year_id ?? schoolBreak.school_year_id;
    const schoolYear = await SchoolYear.findByPk(targetYearId);
    if (!schoolYear) {
      return res.status(404).json({ message: 'السنة الدراسية غير موجودة' });
    }

    const newStart = start_date ?? schoolBreak.start_date;
    const newEnd = end_date ?? schoolBreak.end_date;

    if (newStart < schoolYear.start_date || newEnd > schoolYear.end_date) {
      return res.status(400).json({ message: 'تاريخ العطلة خارج نطاق السنة الدراسية' });
    }

    if (newEnd < newStart) {
      return res.status(400).json({ message: 'يجب أن يكون تاريخ النهاية بعد تاريخ البداية' });
    }

    await schoolBreak.update({
      school_year_id: targetYearId,
      label: label ?? schoolBreak.label,
      start_date: newStart,
      end_date: newEnd,
      type: type ?? schoolBreak.type,
    });

    res.json({ message: 'تم تعديل العطلة بنجاح', schoolBreak });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'حدث خطأ أثناء تعديل العطلة' });
  }
};

// DELETE /school-break/:id
exports.remove = async (req, res) => {
  try {
    const schoolBreak = await SchoolBreak.findByPk(req.params.id);
    if (!schoolBreak) {
      return res.status(404).json({ message: 'العطلة غير موجودة' });
    }

    await schoolBreak.destroy();
    res.json({ message: 'تم حذف العطلة بنجاح' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'حدث خطأ أثناء حذف العطلة' });
  }
};