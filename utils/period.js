const MONTH_LABELS = [
    "جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان",
    "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

// month=1..12 => range = 20th of (month-1) -> 20th of month
function getPeriodRange(month, year) {
    const end = new Date(year, month - 1, 20, 0, 0, 0, 0);
    const start = new Date(year, month - 2, 20, 0, 0, 0, 0);
    return { start, end, label: MONTH_LABELS[month - 1] };
}

function getYearPeriods(year) {
    const periods = [];
    for (let m = 1; m <= 12; m++) {
        periods.push({ month: m, ...getPeriodRange(m, year) });
    }
    return periods;
}

module.exports = { getPeriodRange, getYearPeriods, MONTH_LABELS };