import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatEventDate(value, options = {}) {
  if (!value) return "Date to be announced";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Date to be announced";
  }

  return date.toLocaleString("en-IN", {
    dateStyle: options.dateStyle || "medium",
    timeStyle: options.includeTime ? options.timeStyle || "short" : undefined,
    timeZone: options.timeZone || "Asia/Kolkata",
  });
}

export function formatEventSchedule({ date, isFinalized, includeTime = true } = {}) {
  const formattedDate = formatEventDate(date, { includeTime });
  return isFinalized ? formattedDate : `Approx. ${formattedDate}`;
}
