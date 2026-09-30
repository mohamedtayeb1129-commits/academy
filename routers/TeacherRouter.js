const express = require("express");
const { getAllTeacher, createTeacher, deleteTeacher, updateTeacher } = require("../controllers/TeacherController");
const router = express.Router()

router.get("/",getAllTeacher)
router.post("/",createTeacher)
router.delete("/:id",deleteTeacher)
router.put("/:id",updateTeacher)

module.exports = router