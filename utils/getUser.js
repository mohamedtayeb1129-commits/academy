const { User } = require("../models");

const getUser = async (req) => {
    if (!req.user || !req.user.id) {
        throw new Error("Authenticated user not found.");
    }

    const user = await User.findByPk(req.userId);

    if (!user) {
        throw new Error("User not found.");
    }

    return user;
};

module.exports = {
    getUser,
};

