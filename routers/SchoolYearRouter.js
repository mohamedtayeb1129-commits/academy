const express = require("express");
const { getAllSchoolYear, createSchoolYear, updateSchoolYear } = require("../controllers/SchoolYearContoller");
const router = express.Router()

router.get("/",getAllSchoolYear)
router.post("/",createSchoolYear)
router.put("/:id",updateSchoolYear)

module.exports = router