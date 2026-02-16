import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase";
import {
  mapGameRow,
  mapGuesserRow,
  mapPredictionRow,
  mapRunnerRow,
  mapAwardRow,
} from "@/lib/db-utils";
import PredictionForm from "@/components/game/PredictionForm";
import Leaderboard from "@/components/game/Leaderboard";
import type { LeaderboardData } from "@/components/game/Leaderboard";
import type { Game } from "@/lib/types";

async function getLeaderboardData(game: Game): Promise<LeaderboardData> {
  const db = createAdminClient();

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
  const guesserIds = guessers.map((g) => g.id);

  let predictions: ReturnType<typeof mapPredictionRow>[] = [];
  if (guesserIds.length > 0) {
    const { data: predictionRows } = await db
      .from("predictions")
      .select("*")
      .in("guesser_id", guesserIds);
    predictions = (predictionRows || []).map(mapPredictionRow);
  }

  return {
    game,
    status: game.status,
    guessers,
    predictions,
    runners: (runnerRows || []).map(mapRunnerRow),
    awards: (awardRows || []).map(mapAwardRow),
  };
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = createAdminClient();

  const { data: gameRow } = await db
    .from("games")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!gameRow) notFound();

  const game = mapGameRow(gameRow);

  if (game.status === "setup") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Predictions aren&apos;t open yet. Check back soon!</p>
      </div>
    );
  }

  if (game.status === "predictions_open") {
    const { data: runnerRows } = await db
      .from("runners")
      .select("*")
      .eq("game_id", game.id)
      .order("sort_order", { ascending: true });

    const runners = (runnerRows || []).map(mapRunnerRow);

    return (
      <div className="min-h-screen px-4">
        <PredictionForm game={game} runners={runners} />
      </div>
    );
  }

  // predictions_locked | results_entering | finalized → show leaderboard
  const leaderboardData = await getLeaderboardData(game);

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {game.name}
          </h1>
          <p className="text-sm text-gray-500">
            {game.raceDate} &middot; {game.distances.join(", ")}
          </p>
        </div>

        <Leaderboard slug={slug} initialData={leaderboardData} />
      </div>
    </div>
  );
}
