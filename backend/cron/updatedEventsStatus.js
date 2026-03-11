import cron from "node-cron";
import { updateStatus } from "../utils/updateStatus.js";
import axios from "axios";

const runStatusUpdate = async () => {
  try {
    updateStatus();
    console.log("Event statuses updated successfully.");
  } catch (error) {
    console.error("Error updating event statuses:", error.message);
  }
};

cron.schedule("*/3 * * * *", () => {
  console.log("Running scheduled event status update...");
  runStatusUpdate();
});

cron.schedule("*/2 * * * *", async () => {
  try {
    if (!process.env.SERVER_URL) {
      return;
    }

    let pingUrl;
    try {
      pingUrl = new URL('/api/start', process.env.SERVER_URL).toString();
    } catch {
      console.error("Error pinging server: SERVER_URL is invalid or missing protocol");
      return;
    }

    await axios.get(pingUrl);
    console.log("Pinged server to keep alive");
  } catch (error) {
    console.error("Error pinging server:", error.message);
  }
});
