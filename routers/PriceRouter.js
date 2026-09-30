const express = require("express");
const { getPrices, updatePrices,  } = require("../controllers/PriceController");
const router = express.Router()

router.get("/",getPrices)
router.put("/",updatePrices)

module.exports = router