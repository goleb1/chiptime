import type { AwardDefinition, DistanceDefault, ScoringTierConfig } from "./types";

// ============================================================
// Scoring Tiers
// Ordered from tightest to loosest. The scoring engine walks
// this array and returns the first tier whose threshold >= error%.
// ============================================================

export const SCORING_TIERS: ScoringTierConfig[] = [
  { threshold: 0, points: 100, label: "Dead on" },
  { threshold: 0.5, points: 90, label: "Within 0.5%" },
  { threshold: 1, points: 80, label: "Within 1%" },
  { threshold: 2, points: 65, label: "Within 2%" },
  { threshold: 3, points: 50, label: "Within 3%" },
  { threshold: 5, points: 35, label: "Within 5%" },
  { threshold: 8, points: 20, label: "Within 8%" },
  { threshold: 12, points: 10, label: "Within 12%" },
  { threshold: Infinity, points: 5, label: "Beyond 12%" },
];

// Points awarded for DNF predictions
export const DNF_BADGE_POINTS = 50;
export const DNF_NO_BADGE_POINTS = 0;

// ============================================================
// Supported Distances & Drum Picker Defaults
// ============================================================

export const SUPPORTED_DISTANCES: DistanceDefault[] = [
  { name: "100m",           defaultTimeSeconds: 12 },     // 0:00:12
  { name: "200m",           defaultTimeSeconds: 25 },     // 0:00:25
  { name: "400m",           defaultTimeSeconds: 55 },     // 0:00:55
  { name: "800m",           defaultTimeSeconds: 130 },    // 0:02:10
  { name: "1 Mile",         defaultTimeSeconds: 360 },    // 0:06:00
  { name: "2 Mile",         defaultTimeSeconds: 780 },    // 0:13:00
  { name: "5K",             defaultTimeSeconds: 1500 },   // 0:25:00
  { name: "5 Mile",         defaultTimeSeconds: 2100 },   // 0:35:00
  { name: "10K",            defaultTimeSeconds: 3000 },   // 0:50:00
  { name: "10 Mile",        defaultTimeSeconds: 4800 },   // 1:20:00
  { name: "Half Marathon",  defaultTimeSeconds: 6300 },   // 1:45:00
  { name: "15 Mile",        defaultTimeSeconds: 7500 },   // 2:05:00
  { name: "20 Mile",        defaultTimeSeconds: 9600 },   // 2:40:00
  { name: "Full Marathon",  defaultTimeSeconds: 12600 },  // 3:30:00
  { name: "50K",            defaultTimeSeconds: 18000 },  // 5:00:00
  { name: "50 Mile",        defaultTimeSeconds: 36000 },  // 10:00:00
  { name: "100K",           defaultTimeSeconds: 43200 },  // 12:00:00
  { name: "100 Mile",       defaultTimeSeconds: 86400 },  // 24:00:00
];

export const DISTANCE_NAMES = SUPPORTED_DISTANCES.map((d) => d.name);

// ============================================================
// Award Definitions
// ============================================================

export const AWARD_DEFINITIONS: AwardDefinition[] = [
  {
    type: "sniper",
    icon: "🎯",
    label: "Sniper",
    description:
      "Closest single prediction across the entire game (lowest percentage error on any one runner).",
  },
  {
    type: "trash_can",
    icon: "🗑️",
    label: "Trash Can",
    description:
      "Worst single prediction across the entire game (highest percentage error on any one runner).",
  },
  {
    type: "robot",
    icon: "🤖",
    label: "The Robot",
    description:
      "Most consistent predictor — lowest standard deviation across all predictions.",
  },
  {
    type: "chaos_agent",
    icon: "🎢",
    label: "Chaos Agent",
    description:
      "Highest standard deviation across all predictions. One brilliant pick, one disaster.",
  },
  {
    type: "oracle",
    icon: "🔮",
    label: "Oracle",
    description:
      "Correctly flagged a runner for DNF using a DNF Call.",
  },
  {
    type: "optimist",
    icon: "🚀",
    label: "The Optimist",
    description:
      "Consistently predicted faster finish times than reality. Always believed in the runner.",
  },
  {
    type: "realist",
    icon: "🐢",
    label: "The Realist",
    description:
      "Consistently predicted slower finish times than reality. Knew the race would be tough.",
  },
];

// ============================================================
// Polling
// ============================================================

export const LEADERBOARD_POLL_INTERVAL_MS = 30_000;

// Fallback polling interval used alongside Supabase Realtime subscription
// in case the Realtime connection drops.
export const LEADERBOARD_REALTIME_FALLBACK_MS = 60_000;

export const ADMIN_POLL_INTERVAL_MS = 5_000;

// ============================================================
// DNF Badge Limit
// ============================================================

export const MAX_DNF_BADGES_PER_GUESSER = 2;
