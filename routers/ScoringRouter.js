const express = require("express");
const { getAllScoring, createScoring } = require("../controllers/ScoringController");
const router = express.Router()

router.get("/",getAllScoring)
router.post("/",createScoring)

module.exports = router