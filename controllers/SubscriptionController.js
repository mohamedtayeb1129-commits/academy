const { ActivityLog } = require("../models");
const Student = require("../models/Student");
const Subscription = require("../models/Subscription");

const getUser = async (req) => {
        const userId = req.userId;
        const user = await User.findByPk(userId);
        return user
}

exports.getAllSubscription = async (req,res) => {
    try{
        const subscriptions = await Subscription.findAll({
            include:[
                {
                    model:Student,
                    as:"student",
                    attributes:["id","name","last_name","level"]
                }
            ]
        });
        if(subscriptions.length === 0) {
             return res.status(404).json({
            message: "subscriptions empty.",
        });
        }
        return res.json({
            message: "subscriptions retrieved successfully.",
            subscriptions,
        })
    }catch{
        console.error("Get Supervisors error:", error);

        return res.status(500).json({
            message: "Server error.",
        });
    }
}

exports.paySubscription = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await getUser(req);

        const subscription = await Subscription.findByPk(id, {
            include: [
                {
                    model: Student,
                    attributes: ["id", "name", "last_name"],
                },
            ],
        });

        if (!subscription) {
            return res.status(404).json({
                message: "subscription not found.",
            });
        }

        // Already paid
        if (subscription.status === "payé") {
            return res.status(400).json({
                message: "subscription already paid.",
            });
        }

        await subscription.update({
            status: "payé",
        });

        const studentName = subscription.Student
            ? `${subscription.Student.name} ${subscription.Student.last_name}`
            : `Subscription #${subscription.id}`;

        await ActivityLog.create({
            action: "pay",
            entity_type: "subscription",
            entity_id: subscription.id,
            entity_name: studentName,
            description: `تم دفع اشتراك التلميذ ${studentName} بمبلغ ${subscription.amount}`,
            user_name: `${user.name} ${user.last_name}`,
            user_role: user.role,
            user_id: user.id,
        });

        return res.json({
            message: "subscription payed with success.",
        });

    } catch (error) {
        console.error("Pay subscription error:", error);

        return res.status(500).json({
            message: "Server error.",
        });
    }
};