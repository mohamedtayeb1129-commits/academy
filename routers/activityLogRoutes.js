const express = require("express");
const router = express.Router();
const {
    getActivityLogs,
    getActivityLogById,
} = require("../controllers/activityLogController");

router.get("/", getActivityLogs);
router.get("/:id", getActivityLogById);

module.exports = router;