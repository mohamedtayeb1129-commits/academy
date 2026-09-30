const express = require("express");
const { getPrices, updateTuitionFee } = require("../controllers/PriceController");
const router = express.Router()

router.get("/",getPrices)
router.put("/:id",updateTuitionFee)

module.exports = router