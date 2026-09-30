const express = require("express");
const router = express.Router()
const AuthRouter = require("./routers/AuthRouter")
const StudentRouter = require("./routers/StudentRouter")
const TeacherRouter = require("./routers/TeacherRouter")
const ScoringRouter = require("./routers/ScoringRouter")
const SubscriptionRouter = require("./routers/SubscriptionRouter")
const PriceRouter = require("./routers/PriceRouter")
const TeacherPaymentRoutes = require("./routers/TeacherPaymentRoutes")
const DashboardRouter = require("./routers/DashboardRouter")
const PurchaseRouter = require("./routers/PurchaseRouter")
const SchoolInfoRouter = require("./routers/SchoolInfoRouter")
const DownloadRouter = require("./routers/DownloadRouter")
const activityLogRoutes = require("./routers/activityLogRoutes");
const PackageRoutes = require("./routers/PackageRoutes");
const SchoolYearRouter = require("./routers/SchoolYearRouter");
const SchoolBreakRouter = require("./routers/SchoolBreakRouter");



const AuthenticateToken = require("./middlewares/AuthenticateToken");

router.use("/auth",AuthRouter)
router.use("/student",AuthenticateToken,StudentRouter)
router.use("/teacher",AuthenticateToken,TeacherRouter)
router.use("/scoring",ScoringRouter)
router.use("/subscription",SubscriptionRouter)
router.use("/price",PriceRouter)
router.use("/teacher-payment",TeacherPaymentRoutes)
router.use("/dashboard",DashboardRouter)
router.use("/purchase",AuthenticateToken,PurchaseRouter)
router.use("/school-info",SchoolInfoRouter)
router.use("/download",DownloadRouter)
router.use("/activity-logs", activityLogRoutes);
router.use("/package",AuthenticateToken,PackageRoutes)
router.use("/school-year",AuthenticateToken,SchoolYearRouter)
router.use("/school-break",AuthenticateToken,SchoolBreakRouter)





module.exports = router