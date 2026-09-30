// jobs/scheduler.js
const cron = require("node-cron");
const { runMonthlySubscriptionJob } = require("./generateMonthlySubscriptions");

function startScheduler() {
    // Run at 6am on the 1st of every month
    cron.schedule("0 6 1 * *", () => {
        runMonthlySubscriptionJob().catch(err =>
            console.error("[scheduler] monthly job failed:", err)
        );
    });

    // Catch-up check: if the server was off on the 1st, this runs it
    // as soon as the app starts back up, for any day in the current month.
    runMonthlySubscriptionJob().catch(err =>
        console.error("[scheduler] startup catch-up failed:", err)
    );
}

module.exports = startScheduler;