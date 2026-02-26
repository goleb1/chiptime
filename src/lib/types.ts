// ============================================================
// Chiptime — Core Type Definitions
// Source of truth: chiptime_mvp_prd.md Section 4
// ============================================================

// --- Enums ---

export type GameStatus =
  | "setup"
  | "predictions_open"
  | "predictions_locked"
  | "results_entering"
  | "finalized";

export type RunnerStatus = "registered" | "finished" | "dnf" | "dns";

export type AwardType =
  | "sniper"
  | "trash_can"
  | "robot"
  | "chaos_agent"
  | "oracle"
  | "optimist"
  | "realist";

export type ScoringTier =
  | "Dead on"
  | "Within 0.5%"
  | "Within 1%"
  | "Within 2%"
  | "Within 3%"
  | "Within 5%"
  | "Within 8%"
  | "Within 12%"
  | "Beyond 12%";

export type DnfTier = "DNF Called" | "DNF Missed";

// --- Scoring ---

export interface ScoringTierConfig {
  /** Upper bound of error percentage (inclusive). Use Infinity for the final tier. */
  threshold: number;
  points: number;
  label: ScoringTier;
}

export interface PredictionScore {
  score: number;
  errorPercentage: number | null;
  tierLabel: ScoringTier | DnfTier;
}

export interface GuesserScore {
  guesserId: string;
  totalScore: number;
  bestErrorPercentage: number | null;
  predictionScores: PredictionScore[];
}

// --- Data Model ---

export interface Athlete {
  id: string;
  name: string;
  stravaUrl: string | null;
  photoUrl: string | null;
  /** Keys are distance names (matching SUPPORTED_DISTANCES), values are seconds */
  prs: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface Game {
  id: string;
  slug: string;
  name: string;
  raceDate: string; // ISO date string (YYYY-MM-DD)
  raceStartTime: string; // ISO timestamptz
  distances: string[];
  officialResultsUrl: string | null;
  predictionDeadline: string; // ISO timestamptz
  status: GameStatus;
  showOnHomepage: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Runner {
  id: string;
  gameId: string;
  name: string;
  distance: string;
  notes: string | null;
  actualTimeSeconds: number | null;
  status: RunnerStatus;
  sortOrder: number;
  athleteId: string | null;
  athlete?: Athlete;
  createdAt: string;
}

export interface Guesser {
  id: string;
  gameId: string;
  name: string;
  submittedAt: string | null;
  totalScore: number | null;
  rank: number | null;
  createdAt: string;
}

export interface Prediction {
  id: string;
  guesserId: string;
  runnerId: string;
  predictedTimeSeconds: number;
  dnfBadge: boolean;
  score: number | null;
  errorPercentage: number | null;
  tierLabel: string | null;
  createdAt: string;
}

export interface Award {
  id: string;
  gameId: string;
  guesserId: string;
  awardType: AwardType;
  detail: string | null;
  createdAt: string;
}

// --- Award Definition (for constants) ---

export interface AwardDefinition {
  type: AwardType;
  icon: string;
  label: string;
  description: string;
}

// --- Distance Default (for constants) ---

export interface DistanceDefault {
  name: string;
  defaultTimeSeconds: number;
}
