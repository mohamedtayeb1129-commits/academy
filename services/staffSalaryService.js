const { Op } = require("sequelize");
const Absence = require("../models/Absence");
const StaffSalary = require("../models/StaffSalary");
const { getPayPeriodBounds, getPayPeriodForDateOnly } = require("./salaryService");

// Mapping entre le person_type de "Absence" (pointage) et celui de
// "StaffSalary" (paie).
const ABSENCE_TYPE_TO_STAFF_TYPE = {
    "employé": "employ",
    "surveillants": "supervisor"
};
const STAFF_TYPE_TO_ABSENCE_TYPE = {
    employ: "employé",
    supervisor: "surveillants"
};

function countAbsenceDays(records) {
    let total = 0;
    let unjustified = 0;

    for (const record of records) {
        total++;
        if (!record.justification) unjustified++;
    }

    return { total, unjustified };
}

// beforeSave sur StaffSalary recalcule total_salary automatiquement dès que
// base_salary et/ou unjustified_absence_days sont présents (taux fixe /30).
async function saveAbsenceCounts({ person_type, person_id, month, year, absence_days, unjustified_absence_days, base_salary }) {
    const existing = await StaffSalary.findOne({
        where: { person_type, person_id, month, year }
    });

    if (existing) {
        existing.absence_days = absence_days;
        existing.unjustified_absence_days = unjustified_absence_days;
        if (base_salary !== undefined) existing.base_salary = base_salary;
        await existing.save();
        return existing;
    }

    return StaffSalary.create({
        person_type,
        person_id,
        month,
        year,
        absence_days,
        unjustified_absence_days,
        base_salary,
        status: "non payé"
    });
}

// Recalcul temps réel pour une personne/période donnée (branché sur les hooks Absence)
async function recalculateAbsencesForPerson(staffPersonType, person_id, month, year, absencePersonType) {
    const { startDate, endDate } = getPayPeriodBounds(month, year);

    const records = await Absence.findAll({
        where: {
            person_id,
            person_type: absencePersonType,
            date: {
                [Op.between]: [
                    startDate.toISOString().slice(0, 10),
                    endDate.toISOString().slice(0, 10)
                ]
            }
        }
    });

    const { total, unjustified } = countAbsenceDays(records);

    await saveAbsenceCounts({
        person_type: staffPersonType,
        person_id,
        month,
        year,
        absence_days: total,
        unjustified_absence_days: unjustified
    });
}

// Run officiel (cron du 1er) pour toute la table Absence, groupé par personne.
// Ne crée une ligne StaffSalary que pour les personnes ayant au moins une absence.
async function calculateMonthlyStaffAbsences(month, year) {
    const now = new Date();
    if (!month || !year) {
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        month = prev.getMonth() + 1;
        year = prev.getFullYear();
    }

    const { startDate, endDate } = getPayPeriodBounds(month, year);

    const records = await Absence.findAll({
        where: {
            person_type: { [Op.in]: Object.keys(ABSENCE_TYPE_TO_STAFF_TYPE) },
            date: {
                [Op.between]: [
                    startDate.toISOString().slice(0, 10),
                    endDate.toISOString().slice(0, 10)
                ]
            }
        }
    });

    const grouped = new Map();
    for (const record of records) {
        const key = `${record.person_type}:${record.person_id}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(record);
    }

    const results = [];
    for (const [key, personRecords] of grouped) {
        const [absencePersonType, personIdStr] = key.split(":");
        const person_id = Number(personIdStr);
        const staffPersonType = ABSENCE_TYPE_TO_STAFF_TYPE[absencePersonType];
        const { total, unjustified } = countAbsenceDays(personRecords);

        await saveAbsenceCounts({
            person_type: staffPersonType,
            person_id,
            month,
            year,
            absence_days: total,
            unjustified_absence_days: unjustified
        });

        results.push({ person_type: staffPersonType, person_id, month, year, absence_days: total, unjustified });
    }

    return results;
}

// Run officiel (cron du 1er) pour un type de staff donné, en itérant sur TOUS
// les membres (via PersonModel), pas seulement ceux qui ont une absence.
// Crée donc une ligne StaffSalary même pour ceux à 0 absence.
async function calculateStaffSalaries(personType, PersonModel, month, year) {
    const now = new Date();
    if (!month || !year) {
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        month = prev.getMonth() + 1;
        year = prev.getFullYear();
    }

    const absencePersonType = STAFF_TYPE_TO_ABSENCE_TYPE[personType];
    if (!absencePersonType) {
        throw new Error(`Unknown staff person_type: ${personType}`);
    }

    const { startDate, endDate } = getPayPeriodBounds(month, year);
    const people = await PersonModel.findAll();
    const results = [];

    for (const person of people) {
        const records = await Absence.findAll({
            where: {
                person_type: absencePersonType, // <-- mapped, was the enum-mismatch bug
                person_id: person.id,
                date: {
                    [Op.between]: [
                        startDate.toISOString().slice(0, 10),
                        endDate.toISOString().slice(0, 10)
                    ]
                }
            }
        });

        const { total, unjustified } = countAbsenceDays(records);
        const baseSalary = parseFloat(person.salary || 0);

        // total_salary est recalculé par le hook beforeSave sur StaffSalary
        // (taux fixe = base_salary / 30 * unjustified_absence_days)
        const saved = await saveAbsenceCounts({
            person_type: personType,
            person_id: person.id,
            month,
            year,
            absence_days: total,
            unjustified_absence_days: unjustified,
            base_salary: baseSalary.toFixed(2)
        });

        results.push({
            person_id: person.id,
            name: `${person.name} ${person.last_name}`,
            base_salary: baseSalary.toFixed(2),
            absence_days: total,
            unjustified_absence_days: unjustified,
            total_salary: saved.total_salary
        });
    }

    return results;
}

module.exports = {
    calculateMonthlyStaffAbsences,
    calculateStaffSalaries,
    recalculateAbsencesForPerson,
    countAbsenceDays,
    ABSENCE_TYPE_TO_STAFF_TYPE,
    STAFF_TYPE_TO_ABSENCE_TYPE
};