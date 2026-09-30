const { validationResult } = require("express-validator");
const Purchase = require("../models/Purchase");
const { Op } = require("sequelize");
const { ActivityLog, User } = require("../models");

const getUser = async (req) => {
        const userId = req.userId;
        const user = await User.findByPk(userId);
        return user
}

exports.createPurchase = async (req, res) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array()
            });
        }

        const { item, total_price, quantity, unit_price } = req.body;

        const user = await getUser(req);

        const purchase = await Purchase.create({
            item,
            total_price,
            unit_price,
            quantity
        });

        // Activity log
        await ActivityLog.create({
            action: "create",
            entity_type: "purchase",
            entity_id: purchase.id,
            entity_name: purchase.item,
            description: `تمت إضافة المشتريات ${purchase.item}`,
            user_name: `${user.name} ${user.last_name}`,
            user_role: user.role,
            user_id: user.id,
        });

        return res.status(201).json({
            message: "Purchase created successfully",
            purchase
        });

    } catch (error) {
        console.error("Create purchase error:", error);

        return res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};

exports.getPurchases = async (req, res) => {
    try {
        const purchases = await Purchase.findAll({
            order: [["id", "DESC"]]
        });

        return res.status(200).json({
            purchases
        });

    } catch (error) {
        console.error("Get purchases error:", error);

        return res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};


exports.getPurchaseById = async (req, res) => {
    try {
        const { id } = req.params;

        const purchase = await Purchase.findByPk(id);

        if (!purchase) {
            return res.status(404).json({
                message: "Purchase not found"
            });
        }

        return res.status(200).json({
            purchase
        });

    } catch (error) {
        console.error("Get purchase error:", error);

        return res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};


exports.updatePurchase = async (req, res) => {
    try {
        const { id } = req.params;
        const { item, total_price, unit } = req.body;

        const purchase = await Purchase.findByPk(id);

        if (!purchase) {
            return res.status(404).json({
                message: "Purchase not found"
            });
        }

        const user = await getUser(req);

        await purchase.update({
            item,
            total_price,
            unit
        });

        // Activity log
        await ActivityLog.create({
            action: "update",
            entity_type: "purchase",
            entity_id: purchase.id,
            entity_name: purchase.item,
            description: `تم تعديل المشتريات ${purchase.item}`,
            user_name: `${user.name} ${user.last_name}`,
            user_role: user.role,
            user_id: user.id,
        });

        return res.status(200).json({
            message: "Purchase updated successfully",
            purchase
        });

    } catch (error) {
        console.error("Update purchase error:", error);

        return res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};


exports.deletePurchase = async (req, res) => {
    try {
        const { id } = req.params;

        const purchase = await Purchase.findByPk(id);

        if (!purchase) {
            return res.status(404).json({
                message: "Purchase not found"
            });
        }

        const user = await getUser(req);

        // Save name before deleting
        const purchaseName = purchase.item;

        await purchase.destroy();

        // Activity log
        await ActivityLog.create({
            action: "delete",
            entity_type: "purchase",
            entity_id: id,
            entity_name: purchaseName,
            description: `تم حذف المشتريات ${purchaseName}`,
            user_name: `${user.name} ${user.last_name}`,
            user_role: user.role,
            user_id: user.id,
        });

        return res.status(200).json({
            message: "Purchase deleted successfully"
        });

    } catch (error) {
        console.error("Delete purchase error:", error);

        return res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};


exports.purchasesSummary = async (req, res) => {
  try {
    const { label, monthFilter } = req.query;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const filterWhere = {};
    if (label) {
      filterWhere.item = { [Op.iLike]: `%${label}%` };
    }
    if (monthFilter) {
      const [year, month] = monthFilter.split('-').map(Number);
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);
      filterWhere.createdAt = { [Op.gte]: start, [Op.lt]: end };
    }

    const [monthPurchases, filteredPurchases] = await Promise.all([
      Purchase.findAll({
        where: { createdAt: { [Op.gte]: monthStart, [Op.lt]: monthEnd } },
      }),
      Purchase.findAll({ where: filterWhere }),
    ]);

    const totalCeMois = monthPurchases.reduce((sum, p) => sum + Number(p.total_price), 0);
    const totalFiltre = filteredPurchases.reduce((sum, p) => sum + Number(p.total_price), 0);

    res.json({
      totalCeMois,
      totalFiltre,
      filteredCount: filteredPurchases.length,
    });
  } catch (err) {
    console.error('Get purchase summary error:', err);
    res.status(500).json({ message: 'خطأ في جلب الملخص' });
  }
};