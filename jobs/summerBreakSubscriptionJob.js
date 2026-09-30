// jobs/summerBreakSubscriptionJob.js
const cron = require("node-cron");
const { Op } = require("sequelize");
const SchoolBreak = require("../models/SchoolBreak");
const Subscription = require("../models/Subscription");

async function syncSubscriptionsWithSummerBreak() {
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  const activeSummerBreak = await SchoolBreak.findOne({
    where: {
      type: "summer",
      start_date: { [Op.lte]: today },
      end_date: { [Op.gte]: today },
    },
  });

  if (activeSummerBreak) {
    // Only deactivate subscriptions that are currently active.
    // Mark them so we know WE deactivated them, not the school staff.
    const [count] = await Subscription.update(
      { is_active: false, deactivated_by_break: true },
      { where: { is_active: true } }
    );
    console.log(`[summer-break] Deactivated ${count} subscriptions (break: ${activeSummerBreak.label})`);
  } else {
    // Only reactivate subscriptions WE deactivated for the break.
    // Anything deactivated manually (student left, etc.) is left alone.
    const [count] = await Subscription.update(
      { is_active: true, deactivated_by_break: false },
      { where: { is_active: false, deactivated_by_break: true } }
    );
    if (count > 0) {
      console.log(`[summer-break] Reactivated ${count} subscriptions (no active summer break)`);
    }
  }
}

cron.schedule("5 0 * * *", () => {
  syncSubscriptionsWithSummerBreak().catch((err) =>
    console.error("[summer-break] job failed:", err)
  );
});

module.exports = { syncSubscriptionsWithSummerBreak };