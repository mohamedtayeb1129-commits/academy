const cron = require("node-cron");
const { Op } = require("sequelize");
const Teacher = require("../models/Teacher");
const TeacherPayment = require("../models/TeacherPayment");
const JobLog = require("../models/JobLog");
const SchoolBreak = require("../models/SchoolBreak");
const { getPayPeriodForDateOnly } = require("../services/salaryService");

const JOB_NAME = "generate_monthly_payments";

function todayISO(date = new Date()) {
    return date.toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

// Is `date` inside a summer break? (mirrors isInBreak() in
// generateMonthlySubscriptions.js, but scoped to type: "summer" only —
// teachers still get paid during an "exceptional" break, just not summer)
async function isInSummerBreak(date = new Date()) {
    const day = todayISO(date);

    const activeBreak = await SchoolBreak.findOne({
        where: {
            type: "summer",
            start_date: { [Op.lte]: day },
            end_date: { [Op.gte]: day },
        },
    });

    return activeBreak || null;
}

function periodString(date = new Date()) {
    const dateOnly = date.toISOString().slice(0, 10);
    const { month, year } = getPayPeriodForDateOnly(dateOnly);
    return { month, year, period: `${year}-${String(month).padStart(2, "0")}` };
}

async function hasRunThisMonth(period) {
    const log = await JobLog.findOne({ where: { job_name: JOB_NAME, period } });
    return !!log;
}

async function runGenerateMonthlyStaffSalariesJob() {
    const { month, year, period } = periodString();

    // Claim the period FIRST, atomically, before touching any data.
    try {
        await JobLog.create({ job_name: JOB_NAME, period });
    } catch (err) {
        if (err.name === "SequelizeUniqueConstraintError") {
            console.log(`[${JOB_NAME}] already ran for ${period}, skipping`);
            return;
        }
        throw err;
    }

    let teacherCreated = 0;
    let teacherSkipped = 0;

    const activeSummerBreak = await isInSummerBreak();

    if (!activeSummerBreak) {
        const teachers = await Teacher.findAll({ where: { is_deleted: false } });

        for (const teacher of teachers) {
            // findOrCreate so this never clobbers a row real-time Scoring
            // hooks (recalculateMonthForTeacher) already created/updated.
            const [, wasCreated] = await TeacherPayment.findOrCreate({
                where: { teacher_id: teacher.id, month, year },
                defaults: {
                    hour_count: 0,
                    amount: 0,
                    status: "non payé",
                },
            });

            if (wasCreated) teacherCreated++;
            else teacherSkipped++;
        }
    } else {
        console.log(`[${JOB_NAME}] inside summer break "${activeSummerBreak.label}", skipping teacher rows for ${period}`);
    }

    console.log(
        `[${JOB_NAME}] teachers: created ${teacherCreated}, skipped ${teacherSkipped} | period ${period}`
    );
}

function startGenerateMonthlyStaffSalariesJob() {
    runGenerateMonthlyStaffSalariesJob().catch(err => {
        console.error(`[${JOB_NAME}] boot run failed:`, err);
    });

    // 1st of every month, 00:05 — matches the 1st->1st billing cycle
    cron.schedule("5 0 1 * *", () => {
        runGenerateMonthlyStaffSalariesJob().catch(err => {
            console.error(`[${JOB_NAME}] scheduled run failed:`, err);
        });
    });
}

module.exports = {
    runGenerateMonthlyStaffSalariesJob,
    startGenerateMonthlyStaffSalariesJob,
    hasRunThisMonth,
    periodString,
    JOB_NAME,
};  