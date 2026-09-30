const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Users = require("./Users");

const ActivityLog = sequelize.define("activity_log", {
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },

    action: {
        type: DataTypes.ENUM("create", "update", "delete", "pay", "login"),
        allowNull: false,
    },
    entity_type: {
        type: DataTypes.ENUM("student", "supervisor", "teacher", "employ","user","purchase","subscription","zone","tuition_fee","school_year"),
        allowNull: true,
    },
    entity_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
    },
    entity_name: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    description: {
        type: DataTypes.STRING,
        allowNull: false,
    },
     user_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },

     user_role: {
        type: DataTypes.ENUM("مدير","كاتب(ة)"),
        allowNull: false,
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: Users,
            key: "id",
        },
    },
});

module.exports = ActivityLog;