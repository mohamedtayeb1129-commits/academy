const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const SchoolYear = require("./SchoolYear");
const Student = require("./Student");

const Enrollment = sequelize.define("enrollments", {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },

  student_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references:{
        key:"id",
        model:Student
    }
  },

  school_year_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references:{
        key:"id",
        model:SchoolYear
    }
  },

  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },

  status: {
    type: DataTypes.ENUM("new", "reregistered"),
    defaultValue: "new",
  },
});
module.exports = Enrollment