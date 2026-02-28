"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase";
import { mapGuesserRow } from "@/lib/db-utils";
import type { ActionResult } from "@/lib/db-utils";
import type { Guesser } from "@/lib/types";
import { MAX_DNF_BADGES_PER_GUESSER } from "@/lib/constants";

// ============================================================
// submitPredictions
// ============================================================

export async function submitPredictions(
  formData: FormData
): Promise<ActionResult<Guesser>> {
  const gameId = formData.get("gameId") as string;
  const slug = formData.get("slug") as string;
  const guesserName = (formData.get("guesserName") as string)?.trim();

  if (!gameId || !slug || !guesserName) {
    return { success: false, error: "Game ID, slug, and your name are required." };
  }

  const db = createAdminClient();

  // Fetch game and validate status
  const { data: game } = await db
    .from("games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (!game) {
    return { success: false, error: "Game not found." };
  }

  if (game.status !== "predictions_open") {
    return { success: false, error: "Predictions are not currently open for this game." };
  }

  // Fetch runners for this game
  const { data: runners } = await db
    .from("runners")
    .select("id")
    .eq("game_id", gameId);

  if (!runners || runners.length === 0) {
    return { success: false, error: "No runners found for this game." };
  }

  // Parse predictions from FormData
  const predictions: { runnerId: string; timeSeconds: number; dnfBadge: boolean }[] = [];
  let dnfCount = 0;

  for (const runner of runners) {
    const timeStr = formData.get(`time_${runner.id}`) as string;
    const dnfStr = formData.get(`dnf_${runner.id}`) as string;

    if (!timeStr) {
      return { success: false, error: "All runners must have a predicted time." };
    }

    const timeSeconds = parseInt(timeStr, 10);
    if (isNaN(timeSeconds) || timeSeconds < 0) {
      return { success: false, error: "Invalid time value for one or more runners." };
    }

    const dnfBadge = dnfStr === "true";
    if (dnfBadge) dnfCount++;

    predictions.push({ runnerId: runner.id, timeSeconds, dnfBadge });
  }

  if (dnfCount > MAX_DNF_BADGES_PER_GUESSER) {
    return {
      success: false,
      error: `You can use at most ${MAX_DNF_BADGES_PER_GUESSER} DNF Calls.`,
    };
  }

  // Insert guesser
  const { data: guesser, error: guesserError } = await db
    .from("guessers")
    .insert({
      game_id: gameId,
      name: guesserName,
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (guesserError) {
    return { success: false, error: guesserError.message };
  }

  // Insert all predictions
  const predictionRows = predictions.map((p) => ({
    guesser_id: guesser.id,
    runner_id: p.runnerId,
    predicted_time_seconds: p.timeSeconds,
    dnf_badge: p.dnfBadge,
  }));

  const { error: predError } = await db.from("predictions").insert(predictionRows);

  if (predError) {
    // Clean up the guesser row if predictions fail
    await db.from("guessers").delete().eq("id", guesser.id);
    return { success: false, error: predError.message };
  }

  revalidatePath(`/game/${slug}`);

  return { success: true, data: mapGuesserRow(guesser) };
}
