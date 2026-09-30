const express = require("express");
const { createStudent, getAllStudents, deleteStudents, updateStudent, reenrollStudent, createOfferStudent } = require("../controllers/StudentController");
const router = express.Router()

router.get("/",getAllStudents)
router.post("/",createStudent)
router.post("/offer",createOfferStudent)
router.delete("/:id",deleteStudents)
router.post("/:id/reenroll",reenrollStudent)
router.put("/:id",updateStudent)

module.exports = router