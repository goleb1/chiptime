import type { Athlete, Game, Runner, Guesser, Prediction, Award } from "./types";

// ============================================================
// ActionResult — standard return type for Server Actions
// ============================================================

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ============================================================
// Row Mappers — Supabase snake_case → TypeScript camelCase
// ============================================================

/* eslint-disable @typescript-eslint/no-explicit-any */

export function mapGameRow(row: any): Game {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    raceDate: row.race_date,
    raceStartTime: row.race_start_time,
    distances: row.distances,
    officialResultsUrl: row.official_results_url,
    predictionDeadline: row.prediction_deadline,
    status: row.status,
    showOnHomepage: row.show_on_homepage,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAthleteRow(row: any): Athlete {
  return {
    id: row.id,
    name: row.name,
    stravaUrl: row.strava_url,
    photoUrl: row.photo_url,
    prs: row.prs ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRunnerRow(row: any): Runner {
  return {
    id: row.id,
    gameId: row.game_id,
    name: row.name,
    distance: row.distance,
    notes: row.notes,
    actualTimeSeconds: row.actual_time_seconds,
    status: row.status,
    sortOrder: row.sort_order,
    athleteId: row.athlete_id ?? null,
    athlete: row.athletes ? mapAthleteRow(row.athletes) : undefined,
    createdAt: row.created_at,
  };
}

export function mapGuesserRow(row: any): Guesser {
  return {
    id: row.id,
    gameId: row.game_id,
    name: row.name,
    submittedAt: row.submitted_at,
    totalScore: row.total_score,
    rank: row.rank,
    createdAt: row.created_at,
  };
}

export function mapPredictionRow(row: any): Prediction {
  return {
    id: row.id,
    guesserId: row.guesser_id,
    runnerId: row.runner_id,
    predictedTimeSeconds: row.predicted_time_seconds,
    dnfBadge: row.dnf_badge,
    score: row.score,
    errorPercentage: row.error_percentage,
    tierLabel: row.tier_label,
    createdAt: row.created_at,
  };
}

export function mapAwardRow(row: any): Award {
  return {
    id: row.id,
    gameId: row.game_id,
    guesserId: row.guesser_id,
    awardType: row.award_type,
    detail: row.detail,
    createdAt: row.created_at,
  };
}

/* eslint-enable @typescript-eslint/no-explicit-any */

// ============================================================
// Slug Generator
// ============================================================

export function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}-${suffix}`;
}
