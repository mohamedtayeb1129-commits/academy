const express = require("express");

const router = express.Router();

const {
  getSchoolInfo,
  updateSchoolInfo,
} = require("../controllers/SchoolInfoController");

router.get("/", getSchoolInfo);

router.put("/", updateSchoolInfo);

module.exports = router;