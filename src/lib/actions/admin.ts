"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase";
import {
  generateSlug,
  mapAthleteRow,
  mapGameRow,
  mapRunnerRow,
  mapGuesserRow,
  mapPredictionRow,
} from "@/lib/db-utils";
import type { ActionResult } from "@/lib/db-utils";
import type { Athlete, Game, GameStatus, Runner, RunnerStatus } from "@/lib/types";
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
  const raceStartTime = formData.get("raceStartTime") as string;
  const raceWebsiteUrl = (formData.get("raceWebsiteUrl") as string) || null;
  const location = (formData.get("location") as string) || null;
  const distancesRaw = formData.getAll("distances") as string[];

  if (!name || !raceStartTime || distancesRaw.length === 0) {
    return { success: false, error: "All fields are required, including at least one distance." };
  }

  const slug = generateSlug(name);
  const db = createAdminClient();

  const { data, error } = await db
    .from("games")
    .insert({
      slug,
      name,
      race_date: raceStartTime.split("T")[0],
      race_start_time: raceStartTime,
      prediction_deadline: raceStartTime,
      race_website_url: raceWebsiteUrl,
      location,
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
// deleteGame
// ============================================================

export async function deleteGame(gameId: string): Promise<ActionResult> {
  const db = createAdminClient();

  // Get guesser IDs for this game (needed to cascade predictions)
  const { data: guessers } = await db
    .from("guessers")
    .select("id")
    .eq("game_id", gameId);

  const guesserIds = (guessers || []).map((g: { id: string }) => g.id);

  // Delete in cascade order to respect FK constraints
  await db.from("awards").delete().eq("game_id", gameId);

  if (guesserIds.length > 0) {
    await db.from("predictions").delete().in("guesser_id", guesserIds);
  }

  await db.from("guessers").delete().eq("game_id", gameId);
  await db.from("runners").delete().eq("game_id", gameId);

  const { error } = await db.from("games").delete().eq("id", gameId);

  if (error) {
    return { success: false, error: error.message };
  }

  const adminSecret = process.env.ADMIN_SECRET;
  revalidatePath(`/admin/${adminSecret}`);
  revalidatePath("/");

  return { success: true, data: undefined };
}

// ============================================================
// updateGame
// ============================================================

export async function updateGame(formData: FormData): Promise<ActionResult<Game>> {
  const gameId = formData.get("gameId") as string;
  const name = formData.get("name") as string;
  const raceStartTime = formData.get("raceStartTime") as string;
  const raceWebsiteUrl = (formData.get("raceWebsiteUrl") as string) || null;
  const location = (formData.get("location") as string) || null;
  const distancesRaw = formData.getAll("distances") as string[];

  if (!gameId || !name || !raceStartTime || distancesRaw.length === 0) {
    return { success: false, error: "All fields are required, including at least one distance." };
  }

  const db = createAdminClient();

  const { data, error } = await db
    .from("games")
    .update({
      name,
      race_date: raceStartTime.split("T")[0],
      race_start_time: raceStartTime,
      prediction_deadline: raceStartTime,
      race_website_url: raceWebsiteUrl,
      location,
      distances: distancesRaw,
    })
    .eq("id", gameId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidateGamePages(gameId);

  return { success: true, data: mapGameRow(data) };
}

// ============================================================
// toggleGameVisibility
// ============================================================

export async function toggleGameVisibility(
  gameId: string,
  showOnHomepage: boolean
): Promise<ActionResult> {
  const db = createAdminClient();

  const { error } = await db
    .from("games")
    .update({ show_on_homepage: showOnHomepage })
    .eq("id", gameId);

  if (error) {
    return { success: false, error: error.message };
  }

  const adminSecret = process.env.ADMIN_SECRET;
  revalidatePath(`/admin/${adminSecret}`);
  revalidatePath("/");

  return { success: true, data: undefined };
}

// ============================================================
// addRunner
// ============================================================

export async function addRunner(formData: FormData): Promise<ActionResult<Runner>> {
  const gameId = formData.get("gameId") as string;
  const distance = formData.get("distance") as string;
  const notes = (formData.get("notes") as string) || null;
  const athleteId = (formData.get("athleteId") as string) || null;

  if (!gameId || !distance) {
    return { success: false, error: "Game ID and distance are required." };
  }

  const db = createAdminClient();

  // Resolve runner name from athlete or fall back to manual name field
  let name: string;
  if (athleteId) {
    const { data: athleteRow } = await db
      .from("athletes")
      .select("name")
      .eq("id", athleteId)
      .single();
    if (!athleteRow) {
      return { success: false, error: "Athlete not found." };
    }
    name = athleteRow.name;
  } else {
    name = (formData.get("name") as string) || "";
    if (!name) {
      return { success: false, error: "Name is required when not selecting an athlete." };
    }
  }

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
      athlete_id: athleteId,
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
  const awards = computeAwards(mappedPredictions, mappedGuessers, gameId, mappedRunners);
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
// ensurePhotoBucket — creates athlete-photos bucket if missing
// ============================================================

async function ensurePhotoBucket(
  db: ReturnType<typeof createAdminClient>
): Promise<string | null> {
  const { error } = await db.storage.createBucket("athlete-photos", {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5 MB — matches next.config bodySizeLimit
    allowedMimeTypes: ["image/*"],
  });

  // Ignore "already exists" — that is the expected steady-state case.
  if (error && !error.message.toLowerCase().includes("already exist")) {
    return error.message;
  }

  return null;
}

// ============================================================
// getAthletes
// ============================================================

export async function getAthletes(): Promise<Athlete[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("athletes")
    .select("*")
    .order("name", { ascending: true });
  return (data || []).map(mapAthleteRow);
}

// ============================================================
// createAthlete
// ============================================================

export async function createAthlete(formData: FormData): Promise<ActionResult<Athlete>> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) {
    return { success: false, error: "Name is required." };
  }

  const stravaUrl = (formData.get("stravaUrl") as string) || null;
  const gender = (formData.get("gender") as string) || null;
  const birthYearRaw = formData.get("birthYear") as string;
  const birthYear = birthYearRaw ? parseInt(birthYearRaw, 10) : null;
  const prsRaw = (formData.get("prs") as string) || "{}";

  let prs: Record<string, number>;
  try {
    prs = JSON.parse(prsRaw);
  } catch {
    return { success: false, error: "Invalid PR data." };
  }

  const db = createAdminClient();

  // Photo: prefer a pre-uploaded URL (sent by the client after uploading via
  // /api/admin/upload-photo), fall back to a raw file for small images.
  let photoUrl: string | null = null;
  const photoUrlField = formData.get("photoUrl") as string | null;
  const photoFile = formData.get("photo") as File | null;

  if (photoUrlField) {
    photoUrl = photoUrlField;
  } else if (photoFile && photoFile.size > 0) {
    const bucketErr = await ensurePhotoBucket(db);
    if (bucketErr) {
      return { success: false, error: `Storage setup failed: ${bucketErr}` };
    }
    const ext = photoFile.name.split(".").pop() ?? "jpg";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const bytes = await photoFile.arrayBuffer();
    const mimeType = photoFile.type || "image/jpeg";
    const { error: uploadError } = await db.storage
      .from("athlete-photos")
      .upload(path, bytes, { contentType: mimeType, upsert: false });
    if (uploadError) {
      return { success: false, error: `Photo upload failed: ${uploadError.message}` };
    }
    const { data: urlData } = db.storage.from("athlete-photos").getPublicUrl(path);
    photoUrl = urlData.publicUrl;
  }

  const { data, error } = await db
    .from("athletes")
    .insert({ name, gender, birth_year: birthYear, strava_url: stravaUrl, photo_url: photoUrl, prs })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidateAthletesPage();
  return { success: true, data: mapAthleteRow(data) };
}

// ============================================================
// updateAthlete
// ============================================================

export async function updateAthlete(formData: FormData): Promise<ActionResult<Athlete>> {
  const athleteId = formData.get("athleteId") as string;
  const name = (formData.get("name") as string)?.trim();
  if (!athleteId || !name) {
    return { success: false, error: "Athlete ID and name are required." };
  }

  const stravaUrl = (formData.get("stravaUrl") as string) || null;
  const gender = (formData.get("gender") as string) || null;
  const birthYearRaw = formData.get("birthYear") as string;
  const birthYear = birthYearRaw ? parseInt(birthYearRaw, 10) : null;
  const prsRaw = (formData.get("prs") as string) || "{}";

  let prs: Record<string, number>;
  try {
    prs = JSON.parse(prsRaw);
  } catch {
    return { success: false, error: "Invalid PR data." };
  }

  const db = createAdminClient();

  // Photo: prefer a pre-uploaded URL (sent by the client after uploading via
  // /api/admin/upload-photo), fall back to a raw file for small images.
  let photoUrl: string | undefined; // undefined = don't change existing photo
  const photoUrlField = formData.get("photoUrl") as string | null;
  const photoFile = formData.get("photo") as File | null;

  if (photoUrlField) {
    photoUrl = photoUrlField;
  } else if (photoFile && photoFile.size > 0) {
    const bucketErr = await ensurePhotoBucket(db);
    if (bucketErr) {
      return { success: false, error: `Storage setup failed: ${bucketErr}` };
    }
    const ext = photoFile.name.split(".").pop() ?? "jpg";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const bytes = await photoFile.arrayBuffer();
    const mimeType = photoFile.type || "image/jpeg";
    const { error: uploadError } = await db.storage
      .from("athlete-photos")
      .upload(path, bytes, { contentType: mimeType, upsert: false });
    if (uploadError) {
      return { success: false, error: `Photo upload failed: ${uploadError.message}` };
    }
    const { data: urlData } = db.storage.from("athlete-photos").getPublicUrl(path);
    photoUrl = urlData.publicUrl;
  }

  const updatePayload: Record<string, unknown> = { name, gender, birth_year: birthYear, strava_url: stravaUrl, prs };
  if (photoUrl !== undefined) {
    updatePayload.photo_url = photoUrl;
  }

  const { data, error } = await db
    .from("athletes")
    .update(updatePayload)
    .eq("id", athleteId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidateAthletesPage();
  return { success: true, data: mapAthleteRow(data) };
}

// ============================================================
// deleteAthlete
// ============================================================

export async function deleteAthlete(athleteId: string): Promise<ActionResult> {
  const db = createAdminClient();
  const { error } = await db.from("athletes").delete().eq("id", athleteId);
  if (error) {
    return { success: false, error: error.message };
  }
  revalidateAthletesPage();
  return { success: true, data: undefined };
}

// ============================================================
// Helper: revalidate admin and public pages for a game
// ============================================================

function revalidateAthletesPage() {
  const adminSecret = process.env.ADMIN_SECRET;
  if (adminSecret) {
    revalidatePath(`/admin/${adminSecret}/athletes`);
  }
}

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
