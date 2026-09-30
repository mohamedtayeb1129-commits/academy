// jobs/generateMonthlySubscriptions.js
const cron = require("node-cron");
const Student = require("../models/Student");
const Subscription = require("../models/Subscription");
const JobLog = require("../models/JobLog");
const Price = require("../models/TuitionFee");
const SchoolBreak = require("../models/SchoolBreak");
const { Op } = require("sequelize");

const JOB_NAME = "generate_monthly_subscriptions";

function currentPeriod(date = new Date()) {
    const year = date.getFullYear();
    const month = date.getMonth();
    return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function todayISO(date = new Date()) {
    return date.toISOString().slice(0, 10);
}

async function isInBreak(date = new Date()) {
    const day = todayISO(date);

    const activeBreak = await SchoolBreak.findOne({
        where: {
            start_date: { [Op.lte]: day },
            end_date: { [Op.gte]: day },
        },
    });

    return activeBreak || null;
}

async function hasRunThisMonth(period = currentPeriod()) {
    const log = await JobLog.findOne({ where: { job_name: JOB_NAME, period } });
    return !!log;
}

// Price/TuitionFee is keyed by STAGE ("ابتدائي" / "اعدادي" / "ثانوي" / "باكالوريا"),
// not by the granular `level` string ("السنة الثانية ابتدائي", etc.).
//
// Bac-year students carry stage "ثانوي" but must be billed at the
// "باكالوريا" rate instead — this override catches that case.
function resolvePriceKey(student) {
    if (student.level && student.level.includes("باك")) {
        return "باكالوريا";
    }
    return student.stage;
}

function normalMonthPriceFromCache(student, priceByStage) {
    const key = resolvePriceKey(student);
    const price = priceByStage.get(key);
    if (!price) {
        throw new Error(`no Price row for stage "${key}"`);
    }

    return parseFloat(price.amount);
}

async function runMonthlySubscriptionJob() {
    const period = currentPeriod();

    const activeBreak = await isInBreak();
    if (activeBreak) {
        console.log(`[${JOB_NAME}] inside break "${activeBreak.label}" (${activeBreak.type}), skipping ${period}`);
        return;
    }

    try {
        await JobLog.create({ job_name: JOB_NAME, period });
    } catch (err) {
        if (err.name === "SequelizeUniqueConstraintError") {
            console.log(`[${JOB_NAME}] already ran (or running) for ${period}, skipping`);
            return;
        }
        throw err;
    }

    const [students, allSubscriptions, prices] = await Promise.all([
        Student.findAll(),
        Subscription.findAll({ order: [["createdAt", "DESC"]] }),
        Price.findAll(),
    ]);

    const lastSubscriptionByStudent = new Map();
    for (const sub of allSubscriptions) {
        if (!lastSubscriptionByStudent.has(sub.student_id)) {
            lastSubscriptionByStudent.set(sub.student_id, sub);
        }
    }

    const priceByStage = new Map(prices.map(p => [p.label, p]));

    let created = 0;
    let skipped = 0;

    for (const student of students) {
        const lastSubscription = lastSubscriptionByStudent.get(student.id);

        if (!lastSubscription) {
            skipped++;
            continue;
        }

        if (lastSubscription.is_offer) {
            skipped++;
            continue;
        }

        if (!lastSubscription.is_active) {
            skipped++;
            continue;
        }

        let normalMonthPrice;
        try {
            normalMonthPrice = normalMonthPriceFromCache(student, priceByStage);
        } catch (err) {
            console.error(`[${JOB_NAME}] pricing failed for student ${student.id} (stage: ${student.stage}, level: ${student.level}):`, err.message);
            skipped++;
            continue;
        }

        await Subscription.create({
            amount: normalMonthPrice,
            status: "non payé",
            is_offer: false,
            student_id: student.id,
        });

        created++;
    }

    console.log(`[${JOB_NAME}] created ${created} subscriptions, skipped ${skipped} for ${period}`);
}

function startMonthlySubscriptionJob() {
    runMonthlySubscriptionJob().catch(err => {
        console.error(`[${JOB_NAME}] boot run failed:`, err);
    });

    cron.schedule("5 0 1 * *", () => {
        runMonthlySubscriptionJob().catch(err => {
            console.error(`[${JOB_NAME}] scheduled run failed:`, err);
        });
    });
}

module.exports = {
    runMonthlySubscriptionJob,
    startMonthlySubscriptionJob,
    hasRunThisMonth,
    currentPeriod,
    isInBreak,
    JOB_NAME
};