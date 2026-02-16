import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import {
  mapGameRow,
  mapGuesserRow,
  mapPredictionRow,
  mapRunnerRow,
  mapAwardRow,
} from "@/lib/db-utils";
import { scorePrediction, scoreDnf } from "@/lib/scoring";
import { computeAwards } from "@/lib/awards";
import type { Guesser, Prediction, Runner } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const db = createAdminClient();

  const { data: gameRow, error: gameError } = await db
    .from("games")
    .select("*")
    .eq("slug", slug)
    .single();

  if (gameError || !gameRow) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const game = mapGameRow(gameRow);

  // Fetch guessers, runners, and awards in parallel
  const [{ data: guesserRows }, { data: runnerRows }, { data: awardRows }] =
    await Promise.all([
      db
        .from("guessers")
        .select("*")
        .eq("game_id", game.id)
        .order("rank", { ascending: true, nullsFirst: false }),
      db
        .from("runners")
        .select("*")
        .eq("game_id", game.id)
        .order("sort_order", { ascending: true }),
      db.from("awards").select("*").eq("game_id", game.id),
    ]);

  const guessers = (guesserRows || []).map(mapGuesserRow);
  const runners: Runner[] = (runnerRows || []).map(mapRunnerRow);

  // Fetch predictions for all guessers in this game
  const guesserIds = guessers.map((g) => g.id);
  let predictions: Prediction[] = [];
  if (guesserIds.length > 0) {
    const { data: predictionRows } = await db
      .from("predictions")
      .select("*")
      .in("guesser_id", guesserIds);
    predictions = (predictionRows || []).map(mapPredictionRow);
  }

  const awards = (awardRows || []).map(mapAwardRow);

  // For finalized games, return DB data as-is
  if (game.status === "finalized") {
    return NextResponse.json({
      game,
      status: game.status,
      guessers,
      predictions,
      runners,
      awards,
    });
  }

  // For non-finalized games, compute live scores on-the-fly
  const runnerMap = new Map(runners.map((r) => [r.id, r]));

  // Enrich predictions with live scores
  const livePredictions: Prediction[] = predictions.map((pred) => {
    const runner = runnerMap.get(pred.runnerId);
    if (!runner) return pred;

    if (runner.status === "dnf" || runner.status === "dns") {
      const ps = scoreDnf(pred.dnfBadge);
      return { ...pred, score: ps.score, errorPercentage: ps.errorPercentage, tierLabel: ps.tierLabel };
    }

    if (runner.status === "finished" && runner.actualTimeSeconds !== null) {
      const ps = scorePrediction(pred.predictedTimeSeconds, runner.actualTimeSeconds);
      return { ...pred, score: ps.score, errorPercentage: ps.errorPercentage, tierLabel: ps.tierLabel };
    }

    return pred;
  });

  // Compute guesser totals from live predictions
  const liveGuessers: Guesser[] = guessers.map((g) => {
    const gPreds = livePredictions.filter((p) => p.guesserId === g.id);
    const total = gPreds.reduce((sum, p) => sum + (p.score ?? 0), 0);
    return { ...g, totalScore: total };
  });

  // Sort: totalScore desc, best error asc for tiebreak
  liveGuessers.sort((a, b) => {
    const scoreDiff = (b.totalScore ?? 0) - (a.totalScore ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    const aErrors = livePredictions
      .filter((p) => p.guesserId === a.id && p.errorPercentage != null)
      .map((p) => p.errorPercentage!);
    const bErrors = livePredictions
      .filter((p) => p.guesserId === b.id && p.errorPercentage != null)
      .map((p) => p.errorPercentage!);
    const aBest = aErrors.length > 0 ? Math.min(...aErrors) : Infinity;
    const bBest = bErrors.length > 0 ? Math.min(...bErrors) : Infinity;
    return aBest - bBest;
  });

  // Assign live ranks
  for (let i = 0; i < liveGuessers.length; i++) {
    liveGuessers[i] = { ...liveGuessers[i], rank: i + 1 };
  }

  // Compute live awards
  const liveAwards = computeAwards(livePredictions, liveGuessers, game.id);

  return NextResponse.json({
    game,
    status: game.status,
    guessers: liveGuessers,
    predictions: livePredictions,
    runners,
    awards: liveAwards,
  });
}
