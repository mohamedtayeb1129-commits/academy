const { ActivityLog, User } = require("../models");

const getUser = async (req) => {
        const userId = req.userId;
        const user = await User.findByPk(userId);
        return user
}
exports.createActivityLog = async (
    req,
    action,
    entityType,
    entityId,
    entityName,
    description
) => {
    const user = await getUser(req);

    await ActivityLog.create({
        action,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        description,
        user_name: `${user.name} ${user.last_name}`,
        user_role: user.role,
        user_id: user.id,
    });
};
