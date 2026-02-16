import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import {
  mapGameRow,
  mapGuesserRow,
  mapPredictionRow,
  mapRunnerRow,
  mapAwardRow,
} from "@/lib/db-utils";

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

  // Fetch predictions for all guessers in this game
  const guesserIds = guessers.map((g) => g.id);
  let predictions: ReturnType<typeof mapPredictionRow>[] = [];
  if (guesserIds.length > 0) {
    const { data: predictionRows } = await db
      .from("predictions")
      .select("*")
      .in("guesser_id", guesserIds);
    predictions = (predictionRows || []).map(mapPredictionRow);
  }

  return NextResponse.json({
    game,
    status: game.status,
    guessers,
    predictions,
    runners: (runnerRows || []).map(mapRunnerRow),
    awards: (awardRows || []).map(mapAwardRow),
  });
}
