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
