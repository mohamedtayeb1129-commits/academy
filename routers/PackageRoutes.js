const express = require('express');

const {
  getAllPackages,
  getPackageById,
  createPackage,
  updatePackage,
  deletePackage,
} = require('../controllers/PackageController');

const router = express.Router();

router.get('/', getAllPackages);

router.get('/:id', getPackageById);

router.post('/', createPackage);

router.put('/:id', updatePackage);

router.delete('/:id', deletePackage);

module.exports = router;