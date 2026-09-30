const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const SchoolInfo = sequelize.define("school_info", {
   id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },

  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  address: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true,
    },
  },

  director: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  academic_year: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = SchoolInfo