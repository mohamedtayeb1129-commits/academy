
const { Op, fn, col, literal } = require('sequelize');
const db = require('../models');
const TuitionFee = require('../models/TuitionFee');
const Purchase = require('../models/Purchase');
const Payment = require('../models/Payment');
const { Student, Teacher } = db;

exports.getTotals = async (req, res) => {
  try {
    const [totalStudents, totalTeachers] = await Promise.all([
      Student.count({
      where:{is_deleted:false},
      }),
      Teacher.count({
      where:{is_deleted:false},

      }),
     
    ]);

    return res.status(200).json({
      totalStudents,
      totalTeachers,
    });
  } catch (error) {
    console.error('getTotals error:', error);
    return res.status(500).json({ message: 'error server' });
  }
}



exports.getStudentsByLevel = async (req, res) => {
  try {
    const rows = await Student.findAll({
      where:{is_deleted:false},
      attributes: ['level', [fn('COUNT', col('level')), 'count']],
      group: ['level'],
      raw: true,
    });
    const studentsByLevel = rows.map((r) => ({
      level: r.level,
      count: Number(r.count),
    }));
    return res.status(200).json({ studentsByLevel });
  } catch (error) {
    console.error('getStudentsByLevel error:', error);
    return res.status(500).json({ message: 'حدث خطأ أثناء جلب التلاميذ حسب المستوى' });
  }
}

exports.getPaymentsThisMonth = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const whereThisMonth = {
      createdAt: { [Op.gte]: startOfMonth, [Op.lt]: startOfNextMonth },
    };

    const [totalResult, collectedResult, pendingResult] = await Promise.all([
      Payment.sum('amount', { where: whereThisMonth }),
      Payment.sum('amount', { where: { ...whereThisMonth, status: 'payé' } }),
      Payment.sum('amount', { where: { ...whereThisMonth, status: 'non payé' } }),
    ]);

    const paymentsThisMonth = {
      total: totalResult || 0,
      collected: collectedResult || 0,
      pending: pendingResult || 0,
    };

    return res.status(200).json({ paymentsThisMonth });
  } catch (error) {
    console.error('getPaymentsThisMonth error:', error);
    return res.status(500).json({ message: 'حدث خطأ أثناء جلب مدفوعات هذا الشهر' });
  }
}

exports.getMonthlyPayments = async (req, res) => {
  try {
    const arabicMonths = [
      'جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان',
      'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
    ];

    const rows = await Payment.findAll({
      attributes: [
        [fn('EXTRACT', literal('MONTH FROM "createdAt"')), 'month'],
        [fn('SUM', col('amount')), 'total'],
      ],
      group: [fn('EXTRACT', literal('MONTH FROM "createdAt"'))],
      order: [[fn('EXTRACT', literal('MONTH FROM "createdAt"')), 'ASC']],
      raw: true,
    });

    const monthlyPayments = rows.map((r) => ({
      month: arabicMonths[Number(r.month) - 1],
      total: Number(r.total),
    }));

    return res.status(200).json({ monthlyPayments });
  } catch (error) {
    console.error('getMonthlyPayments error:', error);
    return res.status(500).json({ message: 'حدث خطأ أثناء جلب المدفوعات الشهرية' });
  }
};

exports.getTuitionFees = async (req, res) => {
  try {
    const tuitionFees = await TuitionFee.findAll({
      attributes: ['id', 'label', 'amount'],
      order: [['id', 'ASC']],
    });

    
    return res.status(200).json({ tuitionFees });

  } catch (error) {
    console.error('getTuitionFees error:', error);

    return res.status(500).json({
      message: 'حدث خطأ أثناء جلب تعريفة الدراسة',
    });
  }
};

exports.getDashboardSummary = async (req, res) => {
  try {
    const [totalStudents, totalTeachers] = await Promise.all([
      Student.count(),
      Teacher.count(),
    ]);

    return res.status(200).json({
      dashboardStats: { totalStudents, totalTeachers
       },
    });
  } catch (error) {
    console.error('getDashboardSummary error:', error);
    return res.status(500).json({ message: 'حدث خطأ أثناء جلب بيانات لوحة التحكم' });
  }
}


function getPeriodRange(month, year) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    return { start, end };
}

exports.getFinancialSummary = async(req, res) => {
    try {
        const month = parseInt(req.query.month, 10);
        const year = parseInt(req.query.year, 10);

        if (!month || !year || month < 1 || month > 12) {
            return res.status(400).json({ message: "month و year مطلوبين (month بين 1 و 12)" });
        }

        const { start, end } = getPeriodRange(month, year);
        const dateFilter = { createdAt: { [Op.gte]: start, [Op.lt]: end } };

        // الأرباح (الإيرادات من الاشتراكات المدفوعة)
        const revenueResult = await db.Subscription.findOne({
            attributes: [[fn("SUM", col("amount")), "total"]],
            where: {
                ...dateFilter,
                status: "payé"
            },
            raw: true
        });


        const teacherExpenseResult = await db.TeacherPayment.findOne({
            attributes: [[fn("SUM", col("amount")), "total"]],
            where: { ...dateFilter, status: "payé" },
            raw: true
        });

        const purchaseExpenseResult = await Purchase.findOne({
            attributes: [[fn("SUM", col("total_price")), "total"]],
            where: { ...dateFilter },
            raw: true
        });

        const revenue = parseFloat(revenueResult.total) || 0;
        const teacherExpense = parseFloat(teacherExpenseResult.total) || 0;
        const purchaseExpense = parseFloat(purchaseExpenseResult.total) || 0;

        const totalExpenses =  teacherExpense + purchaseExpense;
        const netProfit = revenue - totalExpenses;

        return res.json({
            period: {
                from: start.toISOString().split("T")[0],
                to: end.toISOString().split("T")[0]
            },
            revenue,
            expenses: {
                teachers: teacherExpense,
                purchases: purchaseExpense,
                total: totalExpenses
            },
            netProfit
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "خطأ في حساب المصاريف والأرباح", error: error.message });
    }
}


exports.getPaymentsSummary = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59
    );
 
    const [collectedResult, pendingResult] = await Promise.all([
      Payment.sum("amount", {
        where: {
          status: "payé",
          date: { [Op.between]: [startOfMonth, endOfMonth] },
        },
      }),
      Payment.sum("amount", {
        where: {
          status: "non payé",
          date: { [Op.between]: [startOfMonth, endOfMonth] },
        },
      }),
    ]);
 
    const collected = collectedResult || 0;
    const pending = pendingResult || 0;
    const total = collected + pending;
 
    return res.status(200).json({
      paymentsThisMonth: { total, collected, pending },
    });
  } catch (error) {
    console.error("getPaymentsSummary error:", error);
    return res
      .status(500)
      .json({ message: "خطأ أثناء جلب ملخص المدفوعات" });
  }
};
 

 
