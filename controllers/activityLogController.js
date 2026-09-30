const ActivityLog = require("../models/ActivityLog");
const Users = require("../models/Users");
const { Op } = require("sequelize");

const getActivityLogs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            action,
            entity_type,
            user_id,
            user_role,
            start_date,
            end_date,
        } = req.query;

        const where = {};

        if (action) where.action = action;
        if (entity_type) where.entity_type = entity_type;
        if (user_id) where.user_id = user_id;
        if (user_role) where.user_role = user_role;

        if (start_date || end_date) {
            where.createdAt = {};
            if (start_date) where.createdAt[Op.gte] = new Date(start_date);
            if (end_date) where.createdAt[Op.lte] = new Date(end_date);
        }

        const offset = (page - 1) * limit;

        const { count, rows } = await ActivityLog.findAndCountAll({
            where,
            include: [
                {
                    model: Users,
                    as:"user",
                    attributes: ["id", "name", "email"],
                },
            ],
            order: [["createdAt", "DESC"]],
            limit: parseInt(limit),
            offset: parseInt(offset),
        });

        return res.status(200).json({
            success: true,
            total: count,
            page: parseInt(page),
            totalPages: Math.ceil(count / limit),
            data: rows,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des logs d'activité",
            error: error.message,
        });
    }
};

const getActivityLogById = async (req, res) => {
    try {
        const { id } = req.params;

        const log = await ActivityLog.findByPk(id, {
            include: [
                {
                    model: Users,
                    attributes: ["id", "name", "email"],
                },
            ],
        });

        if (!log) {
            return res.status(404).json({
                success: false,
                message: "Log d'activité introuvable",
            });
        }

        return res.status(200).json({
            success: true,
            data: log,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération du log",
            error: error.message,
        });
    }
};

module.exports = {
    getActivityLogs,
    getActivityLogById,
};