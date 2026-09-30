const express = require("express");
const { exportStudents, downloadReport } = require("../controllers/DownloadController");
const router = express.Router()

router.get("/students",exportStudents)
router.get("/reports", downloadReport);

module.exports = router