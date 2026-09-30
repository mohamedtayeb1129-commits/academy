const ExcelJS = require("exceljs");

async function buildExcelReport(periods) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "School Management System";

    for (const period of periods) {
        const sheetName = period.label.substring(0, 28); // Excel sheet name limit
        const sheet = workbook.addWorksheet(sheetName, {
            views: [{ rightToLeft: true }]
        });

        sheet.addRow([`تقرير ${period.label}`]).font = { bold: true, size: 14 };
        sheet.addRow([
            `من ${period.from.toLocaleDateString("fr-TN")} إلى ${period.to.toLocaleDateString("fr-TN")}`
        ]);
        sheet.addRow([]);

        // الإيرادات (الاشتراكات)
        sheet.addRow(["الإيرادات - الاشتراكات"]).font = { bold: true };
        const revHeader = sheet.addRow(["الطالب", "المنطقة", "نوع الدفع", "المبلغ"]);
        revHeader.font = { bold: true };
        period.subscriptions.forEach(s => {
            sheet.addRow([
                s.student?.name || s.student_id,
                s.zone?.label || s.zone_id,
                s.payment_type,
                parseFloat(s.amount) || 0
            ]);
        });
        sheet.addRow(["", "", "المجموع", period.totals.revenue]).font = { bold: true };
        sheet.addRow([]);

        // مصاريف الموظفين
        sheet.addRow(["مصاريف الموظفين"]).font = { bold: true };
        sheet.addRow(["النوع", "المعرف", "المبلغ"]).font = { bold: true };
        period.staffPayments.forEach(p => {
            sheet.addRow([p.person_type, p.person_id, parseFloat(p.amount) || 0]);
        });
        sheet.addRow(["", "المجموع", period.totals.staffExpense]).font = { bold: true };
        sheet.addRow([]);

        // مصاريف الأساتذة
        sheet.addRow(["مصاريف الأساتذة"]).font = { bold: true };
        sheet.addRow(["الأستاذ", "عدد الساعات", "المبلغ"]).font = { bold: true };
        period.teacherPayments.forEach(p => {
            sheet.addRow([p.paymentTeacher?.name || p.teacher_id, p.hour_count, parseFloat(p.amount) || 0]);
        });
        sheet.addRow(["", "المجموع", period.totals.teacherExpense]).font = { bold: true };
        sheet.addRow([]);

        // المشتريات
        sheet.addRow(["المشتريات"]).font = { bold: true };
        sheet.addRow(["العنصر", "الكمية", "سعر الوحدة", "المجموع"]).font = { bold: true };
        period.purchases.forEach(p => {
            sheet.addRow([p.item, p.quantity, parseFloat(p.unit_price) || 0, parseFloat(p.total_price) || 0]);
        });
        sheet.addRow(["", "", "المجموع", period.totals.purchaseExpense]).font = { bold: true };
        sheet.addRow([]);

        // ملخص
        sheet.addRow(["الملخص"]).font = { bold: true, size: 12 };
        sheet.addRow(["إجمالي الإيرادات", period.totals.revenue]);
        sheet.addRow(["إجمالي المصاريف", period.totals.totalExpenses]);
        const netRow = sheet.addRow(["الربح الصافي", period.totals.netProfit]);
        netRow.font = { bold: true };

        sheet.columns.forEach(c => (c.width = 22));
    }

    return workbook.xlsx.writeBuffer();
}

module.exports = { buildExcelReport };