import cron from "node-cron";
import fs from "fs";
import path from "path";

import { settleDailyBinaryIncome } from "../incomecalculation/binaryIncome.js";
import {resetDailyIncomes } from "../helper/resetDailyIncome.js"



const logFilePath = path.resolve("lastJobRunDate.txt");

const hasJobRunToday = () => {
  if (!fs.existsSync(logFilePath)) return false;
  const lastRunDate = fs.readFileSync(logFilePath, "utf-8");
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return lastRunDate === today;
};

const updateLastRunDate = () => {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  fs.writeFileSync(logFilePath, today, "utf-8");
};


// Helper function to run the daily jobs
const runDailyJob = async () => {
    const today = new Date().getDay();

  if (hasJobRunToday()) {
    console.log("⏱ Job already executed today, skipping.");
    return;
  }

    await settleDailyBinaryIncome();
 

   updateLastRunDate();

};

let isRunning = false;

cron.schedule("55 23 * * *", async ()=> {
  if (isRunning) {
    console.log("⛔ Job already running, skipping...");
    return;
  }

  isRunning = true;
  console.log("🚀 Starting Daily Job...");
  try {
    await runDailyJob();
    console.log("✅ Job completed.");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    isRunning = false;
  }
}, {
  timezone: "Asia/Kolkata"
});

cron.schedule("5 0 * * *", async () => {
  try {
    await resetDailyIncomes();
    console.log("Daily user income counters reset.");
  } catch (error) {
    console.error("Daily income reset error:", error);
  }
}, {
  timezone: "Asia/Kolkata"
});
