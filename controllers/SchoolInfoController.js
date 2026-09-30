const SchoolInfo = require("../models/SchoolInfo");

// GET school information
exports.getSchoolInfo = async (req, res) => {
  try {
    const schoolInfo = await SchoolInfo.findAll({
      order: [["id", "ASC"]],
    });


    res.status(200).json({
      schoolInfo,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to get school information",
      error: error.message,
    });
  }
};

// UPDATE school information
exports.updateSchoolInfo = async (req, res) => {
  try {
    const {
      name,
      logo,
      address,
      phone,
      email,
      director,
      academic_year,
    } = req.body;

    const schoolInfo = await SchoolInfo.findOne({
      order: [["id", "ASC"]],
    });

    if (!schoolInfo) {
      return res.status(404).json({
        message: "School information not found",
      });
    }

    await schoolInfo.update({
      name,
      logo,
      address,
      phone,
      email,
      director,
      academic_year,
    });

    res.status(200).json({
      message: "School information updated successfully",
      schoolInfo,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to update school information",
      error: error.message,
    });
  }
};