const puppeteer = require("puppeteer");

function renderPeriodHtml(period) {
    const fmt = (d) => d.toLocaleDateString("fr-TN");
    const row = (cells) => `<tr>${cells.map(c => `<td>${c ?? ""}</td>`).join("")}</tr>`;

    return `
    <div class="period">
        <h2>تقرير ${period.label}</h2>
        <p>من ${fmt(period.from)} إلى ${fmt(period.to)}</p>

        <h3>الإيرادات - الاشتراكات</h3>
        <table>
            <thead>${row(["الطالب", "المنطقة", "نوع الدفع", "المبلغ"])}</thead>
            <tbody>
                ${period.subscriptions.map(s => row([
                    s.student?.name || s.student_id, s.zone?.label || s.zone_id, s.payment_type, s.amount
                ])).join("")}
            </tbody>
        </table>
        <p class="total">مجموع الإيرادات: ${period.totals.revenue.toFixed(2)}</p>

        <h3>مصاريف الموظفين</h3>
        <table>
            <thead>${row(["النوع", "المعرف", "المبلغ"])}</thead>
            <tbody>${period.staffPayments.map(p => row([p.person_type, p.person_id, p.amount])).join("")}</tbody>
        </table>
        <p class="total">${period.totals.staffExpense.toFixed(2)}</p>

        <h3>مصاريف الأساتذة</h3>
        <table>
            <thead>${row(["الأستاذ", "عدد الساعات", "المبلغ"])}</thead>
            <tbody>${period.teacherPayments.map(p => row([p.paymentTeacher?.name || p.teacher_id, p.hour_count, p.amount])).join("")}</tbody>
        </table>
        <p class="total">${period.totals.teacherExpense.toFixed(2)}</p>

        <h3>المشتريات</h3>
        <table>
            <thead>${row(["العنصر", "الكمية", "سعر الوحدة", "المجموع"])}</thead>
            <tbody>${period.purchases.map(p => row([p.item, p.quantity, p.unit_price, p.total_price])).join("")}</tbody>
        </table>
        <p class="total">${period.totals.purchaseExpense.toFixed(2)}</p>

        <h3 class="summary">الملخص</h3>
        <p>إجمالي الإيرادات: ${period.totals.revenue.toFixed(2)}</p>
        <p>إجمالي المصاريف: ${period.totals.totalExpenses.toFixed(2)}</p>
        <p class="net">الربح الصافي: ${period.totals.netProfit.toFixed(2)}</p>
    </div>
    `;
}

async function buildPdfReport(periods) {
    const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Arial', sans-serif; direction: rtl; padding: 20px; }
        h2 { border-bottom: 2px solid #2f855a; padding-bottom: 4px; }
        h3 { margin-top: 16px; color: #2f855a; }
        table { width: 100%; border-collapse: collapse; margin-top: 6px; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: right; font-size: 12px; }
        thead td { background: #f0f0f0; font-weight: bold; }
        .total { font-weight: bold; text-align: left; }
        .summary { margin-top: 20px; }
        .net { font-weight: bold; font-size: 16px; color: #2f855a; }
        .period { page-break-after: always; }
    </style>
    </head>
    <body>
        ${periods.map(renderPeriodHtml).join("")}
    </body>
    </html>
    `;

    const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        timeout: 30000
    });
    try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "load", timeout: 15000 });
        const pdf = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: "20px", bottom: "20px" }
        });
        return Buffer.from(pdf);
    } finally {
        await browser.close();
    }
}

module.exports = { buildPdfReport };