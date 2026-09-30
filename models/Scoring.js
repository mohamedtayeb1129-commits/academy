const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Teacher = require("./Teacher");

const Scoring = sequelize.define("scoring", {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    noticed: {
        type: DataTypes.STRING,
    },
    sense: {
        type: DataTypes.ENUM("دخول", "خروج"),
    },
    date: {
        type: DataTypes.DATEONLY,
    },
    time: {
        type: DataTypes.TIME,
    },
    justification: {
        type: DataTypes.BOOLEAN,
    },
    teacher_id: {
        type: DataTypes.BIGINT,
        references: {
            model: Teacher,
            key: "id"
        }
    },
}, {
    hooks: {
        afterCreate: async (scoring) => {
            const { recalculateMonthForTeacher, getPayPeriodForDateOnly } = require("../services/salaryService");
            const { month, year } = getPayPeriodForDateOnly(scoring.date);
            await recalculateMonthForTeacher(scoring.teacher_id, month, year);
        }
    }
});

module.exports = Scoring;