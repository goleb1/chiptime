import { SUPPORTED_DISTANCES } from "./constants";

/**
 * Convert total seconds to a human-readable time string.
 * Examples:
 *   12240 → "3:24:00"
 *   1335  → "22:15"
 *   360   → "6:00"
 */
export function secondsToTimeString(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");

  if (h > 0) {
    return `${h}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/**
 * Convert a time string to total seconds.
 * Accepts "H:MM:SS", "M:SS", or "MM:SS".
 * Examples:
 *   "3:24:00" → 12240
 *   "22:15"   → 1335
 *   "6:00"    → 360
 */
export function timeStringToSeconds(time: string): number {
  const parts = time.split(":").map(Number);

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  throw new Error(`Invalid time format: "${time}". Expected H:MM:SS or M:SS.`);
}

/**
 * Format an error percentage for display.
 * Example: 2.8571 → "2.86%"
 */
export function formatErrorPercentage(error: number): string {
  return `${error.toFixed(2)}%`;
}

/**
 * Get the default time (in seconds) for a given distance name.
 * Returns 0 if the distance is not recognized.
 */
export function getDefaultTimeForDistance(distance: string): number {
  const entry = SUPPORTED_DISTANCES.find((d) => d.name === distance);
  return entry?.defaultTimeSeconds ?? 0;
}

/**
 * Find the best available PR for a given runner distance.
 * Tries an exact distance match first; if none, returns the PR whose
 * distance has the closest default time to the runner's distance.
 * Returns null if the athlete has no PRs at all.
 */
export function findBestPr(
  runnerDistance: string,
  athletePrs: Record<string, number>
): { distance: string; seconds: number; isExact: boolean } | null {
  const prEntries = Object.entries(athletePrs).filter(([, s]) => s > 0);
  if (prEntries.length === 0) return null;

  if (athletePrs[runnerDistance]) {
    return { distance: runnerDistance, seconds: athletePrs[runnerDistance], isExact: true };
  }

  const runnerDefault = getDefaultTimeForDistance(runnerDistance);
  let closest: { distance: string; seconds: number } | null = null;
  let minDiff = Infinity;

  for (const [dist, secs] of prEntries) {
    const prDefault = getDefaultTimeForDistance(dist);
    const diff = Math.abs(prDefault - runnerDefault);
    if (diff < minDiff) {
      minDiff = diff;
      closest = { distance: dist, seconds: secs };
    }
  }

  return closest ? { ...closest, isExact: false } : null;
}

/**
 * Format a YYYY-MM-DD date string to a readable form: "Sun, March 1st, 2026"
 * Uses the local Date constructor to avoid UTC timezone shifting the date.
 */
export function formatRaceDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  const monthStr = date.toLocaleDateString("en-US", { month: "long" });
  const suffix = getOrdinalSuffix(day);
  return `${weekday}, ${monthStr} ${day}${suffix}, ${year}`;
}

function getOrdinalSuffix(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return "th";
  switch (v % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

/**
 * Format an ISO datetime string to a 12-hour time: "7:00 AM"
 *
 * Parses directly from the string rather than using `new Date()` to avoid
 * timezone conversion. The datetime-local input submits a wall-clock time
 * (e.g. "2026-05-03T09:00") which Supabase stores as UTC. Converting via
 * the browser's local timezone would shift the displayed time incorrectly.
 */
export function formatRaceTime(isoStr: string): string {
  const timePart = isoStr.split("T")[1] ?? "";
  const [hourStr, minuteStr] = timePart.split(":");
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr ?? "0", 10);
  if (isNaN(hour)) return "";
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute.toString().padStart(2, "0")} ${ampm}`;
}
