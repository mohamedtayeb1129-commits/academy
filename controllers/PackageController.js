const { Package } = require('../models');
const PackageSubject = require('../models/packageSubject');

// GET /api/v1/packages
exports.getAllPackages = async (req, res) => {
  try {
    const packages = await Package.findAll({
      include: [
        {
          model: PackageSubject,
          as: 'packageSubject',
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json(packages);
  } catch (error) {
    console.error('Error fetching packages:', error);

    res.status(500).json({
      message: 'حدث خطأ أثناء جلب الباقات',
      error: error.message,
    });
  }
};

// GET /api/v1/packages/:id
exports.getPackageById = async (req, res) => {
  try {
    const { id } = req.params;

    const packageData = await Package.findByPk(id, {
      include: [
        {
          model: PackageSubject,
          as: 'PackageSubject',
        },
      ],
    });

    if (!packageData) {
      return res.status(404).json({
        message: 'الباقة غير موجودة',
      });
    }

    res.status(200).json(packageData);
  } catch (error) {
    console.error('Error fetching package:', error);

    res.status(500).json({
      message: 'حدث خطأ أثناء جلب الباقة',
      error: error.message,
    });
  }
};

// POST /api/v1/packages
exports.createPackage = async (req, res) => {
  try {
    const {
      name,
      section,
      amount,
      subjects = [],
    } = req.body;

    if (!name || !section || amount === undefined) {
      return res.status(400).json({
        message: 'الاسم والقسم والمبلغ مطلوبة',
      });
    }

    const packageData = await Package.create({
      name,
      section,
      amount,
    });

    // Create package subjects
    if (Array.isArray(subjects) && subjects.length > 0) {
      const subjectData = subjects.map((subject) => ({
        name: typeof subject === 'string' ? subject : subject.name,
        package_id: packageData.id,
      }));

      await PackageSubject.bulkCreate(subjectData);
    }

    const result = await Package.findByPk(packageData.id, {
      include: [
        {
          model: PackageSubject,
          as: 'packageSubject',
        },
      ],
    });

    res.status(201).json({
      message: 'تم إنشاء الباقة بنجاح',
      package: result,
    });
  } catch (error) {
    console.error('Error creating package:', error);

    res.status(500).json({
      message: 'حدث خطأ أثناء إنشاء الباقة',
      error: error.message,
    });
  }
};

// PUT /api/v1/packages/:id
exports.updatePackage = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      section,
      amount,
      subjects = [],
    } = req.body;

    const packageData = await Package.findByPk(id);

    if (!packageData) {
      return res.status(404).json({
        message: 'الباقة غير موجودة',
      });
    }

    // Update package
    await packageData.update({
      name,
      section,
      amount,
    });

    // Replace subjects
    if (Array.isArray(subjects)) {
      await PackageSubject.destroy({
        where: {
          package_id: id,
        },
      });

      if (subjects.length > 0) {
        const subjectData = subjects.map((subject) => ({
          name: typeof subject === 'string' ? subject : subject.name,
          package_id: id,
        }));

        await PackageSubject.bulkCreate(subjectData);
      }
    }

    const result = await Package.findByPk(id, {
      include: [
        {
          model: PackageSubject,
          as: 'packageSubject',
        },
      ],
    });

    res.status(200).json({
      message: 'تم تحديث الباقة بنجاح',
      package: result,
    });
  } catch (error) {
    console.error('Error updating package:', error);

    res.status(500).json({
      message: 'حدث خطأ أثناء تحديث الباقة',
      error: error.message,
    });
  }
};

// DELETE /api/v1/packages/:id
exports.deletePackage = async (req, res) => {
  try {
    const { id } = req.params;

    const packageData = await Package.findByPk(id);

    if (!packageData) {
      return res.status(404).json({
        message: 'الباقة غير موجودة',
      });
    }

    // Delete subjects belonging to the package
    await PackageSubject.destroy({
      where: {
        package_id: id,
      },
    });

    await packageData.destroy();

    res.status(200).json({
      message: 'تم حذف الباقة بنجاح',
    });
  } catch (error) {
    console.error('Error deleting package:', error);

    res.status(500).json({
      message: 'حدث خطأ أثناء حذف الباقة',
      error: error.message,
    });
  }
};
