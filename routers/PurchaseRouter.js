const express = require("express");

const router = express.Router();

const {
    createPurchase,
    getPurchases,
    getPurchaseById,
    updatePurchase,
    deletePurchase,
    purchasesSummary
} = require("../controllers/PurchaseController");

router.post("/", createPurchase);

router.get("/", getPurchases);

router.get("/summary", purchasesSummary);


router.get("/:id", getPurchaseById);

router.put("/:id", updatePurchase);

router.delete("/:id", deletePurchase);


module.exports = router;