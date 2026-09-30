const { Student, Subscription } = require("../models");
const ExcelJS = require("exceljs");
const puppeteer = require("puppeteer");

// Translate stored payment status (French enum values) to Arabic display text
function statusLabel(s) {
    if (s === "payé") return "مدفوع";
    if (s === "en attente") return "في الانتظار";
    if (s === "non payé") return "غير مدفوع";
    return s || "";
}

// Format money
function amountLabel(v) {
    if (v === null || v === undefined) return "";
    return Number(v).toFixed(2);
}

// Escape values before injecting into HTML
function esc(value) {
    if (value === null || value === undefined) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// Pull subscription-related fields out of a student in one place,
// so both the PDF and Excel builders stay in sync.
function getSubscriptionFields(student) {
    const sub = student.subscription || null;

    return {
        status: sub ? statusLabel(sub.status) : "",
        amount: amountLabel(sub?.amount),
    };
}

function buildStudentsHtml({ students, level }) {
    const rows = students
        .map((student, index) => {
            const phone = student.father_phone || student.mother_phone || student.phone || "";
            const sub = getSubscriptionFields(student);

            return `
                <tr class="${index % 2 === 0 ? "row-alt" : ""}">
                    <td class="col-num">${index + 1}</td>
                    <td>${esc(student.last_name)}</td>
                    <td>${esc(student.name)}</td>
                    <td class="col-center">${esc(student.level)}</td>
                    <td class="col-center">${esc(phone)}</td>
                    <td>${esc(student.address)}</td>
                    <td class="col-center">${esc(sub.status)}</td>
                    <td class="col-center">${esc(sub.amount)}</td>
                </tr>
            `;
        })
        .join("");

    return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
    <meta charset="UTF-8" />
    <style>
        @font-face {
            font-family: 'Cairo';
            src: local('Cairo');
        }

        * { box-sizing: border-box; }

        body {
            font-family: 'Cairo', 'Amiri', 'Segoe UI', Tahoma, sans-serif;
            margin: 0;
            padding: 24px 30px;
            color: #0F172A;
            direction: rtl;
        }

        .header {
            background: #1E293B;
            color: #FFFFFF;
            border-radius: 10px;
            padding: 18px 20px;
            text-align: center;
            margin-bottom: 16px;
        }

        .header h1 {
            margin: 0;
            font-size: 20px;
            font-weight: 700;
        }

        .meta-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
            color: #64748B;
            margin-bottom: 12px;
            padding: 0 4px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
        }

        thead tr {
            background: #1E293B;
            color: #FFFFFF;
        }

        th, td {
            padding: 6px 4px;
            text-align: right;
            border: 0.5px solid #CBD5E1;
        }

        th {
            font-weight: 600;
            text-align: center;
        }

        .col-center { text-align: center; }
        .col-num { text-align: center; width: 26px; color: #64748B; }

        tr.row-alt td {
            background: #F1F5F9;
        }
    </style>
    </head>
    <body>
        <div class="header">
            <h1>لائحة التلاميذ</h1>
        </div>

        <div class="meta-row">
            <span>${level ? `القسم: ${esc(level)}` : "جميع الأقسام"}</span>
            <span>عدد التلاميذ: ${students.length}</span>
        </div>

        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>اللقب</th>
                    <th>الاسم</th>
                    <th>القسم</th>
                    <th>الهاتف</th>
                    <th>العنوان</th>
                    <th>حالة الدفع</th>
                    <th>المبلغ</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    </body>
    </html>
    `;
}

async function buildStudentsExcel({ students }) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "School Management System";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("التلاميذ", {
        views: [{ rightToLeft: true }],
    });

    sheet.columns = [
        { header: "#", key: "num", width: 6 },
        { header: "اللقب", key: "last_name", width: 16 },
        { header: "الاسم", key: "name", width: 16 },
        { header: "القسم", key: "level", width: 14 },
        { header: "الهاتف", key: "phone", width: 14 },
        { header: "العنوان", key: "address", width: 24 },
        { header: "حالة الدفع", key: "status", width: 14 },
        { header: "المبلغ", key: "amount", width: 12 },
    ];

    const thinBorder = {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };

    // Header styling
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF1E293B" },
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = thinBorder;
    });
    headerRow.height = 22;

    students.forEach((student, index) => {
        const phone = student.father_phone || student.mother_phone || student.phone || "";
        const sub = getSubscriptionFields(student);

        const row = sheet.addRow({
            num: index + 1,
            last_name: student.last_name || "",
            name: student.name || "",
            level: student.level || "",
            phone,
            address: student.address || "",
            status: sub.status,
            amount: sub.amount,
        });

        row.eachCell((cell) => {
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.border = thinBorder;
            if (index % 2 === 0) {
                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FFF1F5F9" },
                };
            }
        });
    });

    return workbook.xlsx.writeBuffer();
}

exports.exportStudents = async (req, res) => {
    try {
        const { format, level } = req.query;

        if (!["pdf", "excel"].includes(format)) {
            return res.status(400).json({
                success: false,
                message: "Format must be pdf or excel.",
            });
        }

        const where = { is_deleted: false };
        if (level && level.trim() !== "") {
            where.level = level; // was where.class (no such field on Student)
        }

        const students = await Student.findAll({
            where,
            include: [
                {
                    model: Subscription,
                    as: "subscription",
                },
            ],
            order: [
                ["last_name", "ASC"],
                ["name", "ASC"],
            ],
        });

        const rawFilename = `لائحة-التلاميذ${level ? `-${level}` : ""}`;
        const asciiFallback = `students${level ? `-${level}` : ""}`;

        // =========================
        // PDF (Puppeteer)
        // =========================
        if (format === "pdf") {
            const html = buildStudentsHtml({ students, level });

            const browser = await puppeteer.launch({
                headless: "new",
                args: ["--no-sandbox", "--disable-setuid-sandbox"],
            });

            try {
                const page = await browser.newPage();
                await page.setContent(html, { waitUntil: "networkidle0" });

                const pdfBuffer = await page.pdf({
                    format: "A4",
                    landscape: true,
                    printBackground: true,
                    margin: { top: "20px", bottom: "30px", left: "20px", right: "20px" },
                });

                res.setHeader("Content-Type", "application/pdf");
                res.setHeader(
                    "Content-Disposition",
                    `attachment; filename="${asciiFallback}.pdf"; filename*=UTF-8''${encodeURIComponent(rawFilename)}.pdf`
                );

                return res.send(pdfBuffer);
            } finally {
                await browser.close();
            }
        }

        // =========================
        // EXCEL
        // =========================
        const buffer = await buildStudentsExcel({ students });

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${asciiFallback}.xlsx"; filename*=UTF-8''${encodeURIComponent(rawFilename)}.xlsx`
        );

        return res.send(buffer);
    } catch (error) {
        console.error("Export students error:", error);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de l'exportation des élèves.",
            error: error.message,
        });
    }
};

exports.downloadReport = async (req, res) => {
    try {
        const { year, month, type } = req.query;
        const yearNum = parseInt(year, 10);

        if (!yearNum || !type) {
            return res.status(400).json({ message: "year و type مطلوبين" });
        }

        const periods = await getDetailedReportData({ year: yearNum, month });
        const isAll = month === "all" || !month;
        const rawLabel = isAll ? `full-${yearNum}` : `${periods[0].label}-${yearNum}`;

        const buildDisposition = (ext) => {
            const asciiFallback = `report-${yearNum}.${ext}`;
            const encoded = encodeURIComponent(`report-${rawLabel}.${ext}`);
            return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
        };

        if (type === "excel") {
            const buffer = await buildExcelReport(periods);
            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", buildDisposition("xlsx"));
            return res.send(buffer);
        }

        if (type === "pdf") {
            const buffer = await buildPdfReport(periods);
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", buildDisposition("pdf"));
            return res.send(buffer);
        }

        return res.status(400).json({ message: "type غير صالح (pdf أو excel)" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "خطأ في إنشاء التقرير", error: error.message });
    }
};