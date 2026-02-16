"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase";
import {
  generateSlug,
  mapGameRow,
  mapRunnerRow,
  mapGuesserRow,
  mapPredictionRow,
} from "@/lib/db-utils";
import type { ActionResult } from "@/lib/db-utils";
import type { Game, GameStatus, Runner, RunnerStatus } from "@/lib/types";
import { scorePrediction, scoreDnf, scoreGuesser } from "@/lib/scoring";
import { computeAwards } from "@/lib/awards";

// ============================================================
// Valid state transitions
// ============================================================

const VALID_TRANSITIONS: Record<GameStatus, GameStatus[]> = {
  setup: ["predictions_open"],
  predictions_open: ["predictions_locked", "results_entering"],
  predictions_locked: ["results_entering"],
  results_entering: ["finalized"],
  finalized: [],
};

// ============================================================
// createGame
// ============================================================

export async function createGame(formData: FormData): Promise<ActionResult<Game>> {
  const name = formData.get("name") as string;
  const raceDate = formData.get("raceDate") as string;
  const raceStartTime = formData.get("raceStartTime") as string;
  const predictionDeadline = formData.get("predictionDeadline") as string;
  const distancesRaw = formData.getAll("distances") as string[];

  if (!name || !raceDate || !raceStartTime || !predictionDeadline || distancesRaw.length === 0) {
    return { success: false, error: "All fields are required, including at least one distance." };
  }

  const slug = generateSlug(name);
  const db = createAdminClient();

  const { data, error } = await db
    .from("games")
    .insert({
      slug,
      name,
      race_date: raceDate,
      race_start_time: raceStartTime,
      prediction_deadline: predictionDeadline,
      distances: distancesRaw,
      status: "setup",
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  const adminSecret = process.env.ADMIN_SECRET;
  revalidatePath(`/admin/${adminSecret}`);

  return { success: true, data: mapGameRow(data) };
}

// ============================================================
// addRunner
// ============================================================

export async function addRunner(formData: FormData): Promise<ActionResult<Runner>> {
  const gameId = formData.get("gameId") as string;
  const name = formData.get("name") as string;
  const distance = formData.get("distance") as string;
  const notes = (formData.get("notes") as string) || null;

  if (!gameId || !name || !distance) {
    return { success: false, error: "Game ID, name, and distance are required." };
  }

  const db = createAdminClient();

  // Get max sort_order for this game
  const { data: existing } = await db
    .from("runners")
    .select("sort_order")
    .eq("game_id", gameId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const sortOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data, error } = await db
    .from("runners")
    .insert({
      game_id: gameId,
      name,
      distance,
      notes,
      sort_order: sortOrder,
      status: "registered",
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidateGamePages(gameId);
  return { success: true, data: mapRunnerRow(data) };
}

// ============================================================
// updateRunner
// ============================================================

export async function updateRunner(formData: FormData): Promise<ActionResult<Runner>> {
  const runnerId = formData.get("runnerId") as string;
  const name = formData.get("name") as string;
  const distance = formData.get("distance") as string;
  const notes = (formData.get("notes") as string) || null;

  if (!runnerId || !name || !distance) {
    return { success: false, error: "Runner ID, name, and distance are required." };
  }

  const db = createAdminClient();

  const { data, error } = await db
    .from("runners")
    .update({ name, distance, notes })
    .eq("id", runnerId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidateGamePages(data.game_id);
  return { success: true, data: mapRunnerRow(data) };
}

// ============================================================
// deleteRunner
// ============================================================

export async function deleteRunner(runnerId: string, gameId: string): Promise<ActionResult> {
  const db = createAdminClient();

  // Verify game is still in setup
  const { data: game } = await db
    .from("games")
    .select("status")
    .eq("id", gameId)
    .single();

  if (!game || game.status !== "setup") {
    return { success: false, error: "Runners can only be deleted during setup." };
  }

  const { error } = await db.from("runners").delete().eq("id", runnerId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidateGamePages(gameId);
  return { success: true, data: undefined };
}

// ============================================================
// updateGameStatus
// ============================================================

export async function updateGameStatus(
  gameId: string,
  newStatus: GameStatus
): Promise<ActionResult<Game>> {
  const db = createAdminClient();

  const { data: game } = await db
    .from("games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (!game) {
    return { success: false, error: "Game not found." };
  }

  const currentStatus = game.status as GameStatus;
  const allowed = VALID_TRANSITIONS[currentStatus];

  if (!allowed.includes(newStatus)) {
    return {
      success: false,
      error: `Cannot transition from "${currentStatus}" to "${newStatus}".`,
    };
  }

  const { data: updated, error } = await db
    .from("games")
    .update({ status: newStatus })
    .eq("id", gameId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidateGamePages(gameId);
  return { success: true, data: mapGameRow(updated) };
}

// ============================================================
// enterResult
// ============================================================

export async function enterResult(
  runnerId: string,
  gameId: string,
  actualTimeSeconds: number | null,
  runnerStatus: RunnerStatus
): Promise<ActionResult> {
  const db = createAdminClient();

  // Update runner
  const { error: runnerError } = await db
    .from("runners")
    .update({
      actual_time_seconds: actualTimeSeconds,
      status: runnerStatus,
    })
    .eq("id", runnerId);

  if (runnerError) {
    return { success: false, error: runnerError.message };
  }

  // Score all predictions for this runner
  const { data: predictions } = await db
    .from("predictions")
    .select("*")
    .eq("runner_id", runnerId);

  if (predictions && predictions.length > 0) {
    for (const pred of predictions) {
      let score: number;
      let errorPercentage: number | null;
      let tierLabel: string;

      if (runnerStatus === "dnf" || runnerStatus === "dns") {
        const result = scoreDnf(pred.dnf_badge);
        score = result.score;
        errorPercentage = result.errorPercentage;
        tierLabel = result.tierLabel;
      } else if (runnerStatus === "finished" && actualTimeSeconds !== null) {
        const result = scorePrediction(pred.predicted_time_seconds, actualTimeSeconds);
        score = result.score;
        errorPercentage = result.errorPercentage;
        tierLabel = result.tierLabel;
      } else {
        continue;
      }

      await db
        .from("predictions")
        .update({
          score,
          error_percentage: errorPercentage,
          tier_label: tierLabel,
        })
        .eq("id", pred.id);
    }
  }

  // Auto-transition from predictions_locked to results_entering
  const { data: game } = await db
    .from("games")
    .select("status")
    .eq("id", gameId)
    .single();

  if (game && game.status === "predictions_locked") {
    await db
      .from("games")
      .update({ status: "results_entering" })
      .eq("id", gameId);
  }

  revalidateGamePages(gameId);
  return { success: true, data: undefined };
}

// ============================================================
// finalizeGame
// ============================================================

export async function finalizeGame(gameId: string): Promise<ActionResult> {
  const db = createAdminClient();

  // Verify all runners have been processed
  const { data: runners } = await db
    .from("runners")
    .select("*")
    .eq("game_id", gameId);

  if (!runners || runners.length === 0) {
    return { success: false, error: "No runners found for this game." };
  }

  const unprocessed = runners.filter((r: { status: string }) => r.status === "registered");
  if (unprocessed.length > 0) {
    const names = unprocessed.map((r: { name: string }) => r.name).join(", ");
    return {
      success: false,
      error: `These runners still need results: ${names}`,
    };
  }

  // Fetch all guessers and predictions
  const { data: guessersRaw } = await db
    .from("guessers")
    .select("*")
    .eq("game_id", gameId);

  const { data: predictionsRaw } = await db
    .from("predictions")
    .select("*")
    .in(
      "guesser_id",
      (guessersRaw || []).map((g: { id: string }) => g.id)
    );

  const mappedRunners = (runners || []).map(mapRunnerRow);
  const mappedGuessers = (guessersRaw || []).map(mapGuesserRow);
  const mappedPredictions = (predictionsRaw || []).map(mapPredictionRow);

  // Score each guesser
  const guesserScores = mappedGuessers.map((guesser) => {
    const guesserPreds = mappedPredictions.filter(
      (p) => p.guesserId === guesser.id
    );
    return scoreGuesser(guesserPreds, mappedRunners);
  });

  // Rank guessers: totalScore DESC, bestErrorPercentage ASC for ties
  guesserScores.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    const aErr = a.bestErrorPercentage ?? Infinity;
    const bErr = b.bestErrorPercentage ?? Infinity;
    return aErr - bErr;
  });

  // Update guesser totals and ranks
  for (let i = 0; i < guesserScores.length; i++) {
    const gs = guesserScores[i];
    await db
      .from("guessers")
      .update({
        total_score: gs.totalScore,
        rank: i + 1,
      })
      .eq("id", gs.guesserId);
  }

  // Compute and insert awards
  const awards = computeAwards(mappedPredictions, mappedGuessers, gameId);
  if (awards.length > 0) {
    // Delete existing awards for this game first
    await db.from("awards").delete().eq("game_id", gameId);

    const awardRows = awards.map((a) => ({
      game_id: a.gameId,
      guesser_id: a.guesserId,
      award_type: a.awardType,
      detail: a.detail,
    }));

    await db.from("awards").insert(awardRows);
  }

  // Set game status to finalized
  const { error } = await db
    .from("games")
    .update({ status: "finalized" })
    .eq("id", gameId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidateGamePages(gameId);
  return { success: true, data: undefined };
}

// ============================================================
// Helper: revalidate admin and public pages for a game
// ============================================================

async function revalidateGamePages(gameId: string) {
  const db = createAdminClient();
  const { data: game } = await db
    .from("games")
    .select("slug")
    .eq("id", gameId)
    .single();

  const adminSecret = process.env.ADMIN_SECRET;
  if (adminSecret) {
    revalidatePath(`/admin/${adminSecret}`);
    if (game?.slug) {
      revalidatePath(`/admin/${adminSecret}/game/${game.slug}`);
    }
  }
  if (game?.slug) {
    revalidatePath(`/game/${game.slug}`);
    revalidatePath(`/api/games/${game.slug}`);
    revalidatePath(`/api/games/${game.slug}/leaderboard`);
  }
}
