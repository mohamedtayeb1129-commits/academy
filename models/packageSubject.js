const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Package = require('./Package');

const PackageSubject = sequelize.define(
  'package_subject',
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
          type: DataTypes.STRING,
          allowNull: false,
    },

    package_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references:{
        key:"id",
        model:Package
      }
    },
  },
  {
    tableName: 'package_subjects',
    timestamps: true,
  }
);

module.exports = PackageSubject;