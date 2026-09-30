// models/JobLog.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const JobLog = sequelize.define("job_logs", {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    job_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    period: {
        // e.g. "2026-08" — one row per job per month
        type: DataTypes.STRING,
        allowNull: false
    },
    ran_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    indexes: [
        { unique: true, fields: ["job_name", "period"] }
    ]
});

module.exports = JobLog;