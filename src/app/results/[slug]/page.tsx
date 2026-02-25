import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase";
import {
  mapGameRow,
  mapGuesserRow,
  mapPredictionRow,
  mapRunnerRow,
  mapAwardRow,
} from "@/lib/db-utils";
import Leaderboard from "@/components/game/Leaderboard";
import type { LeaderboardData } from "@/components/game/Leaderboard";

async function getLeaderboardData(slug: string): Promise<LeaderboardData | null> {
  const db = createAdminClient();

  const { data: gameRow } = await db
    .from("games")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!gameRow) return null;

  const game = mapGameRow(gameRow);

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

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getLeaderboardData(slug);

  if (!data) notFound();

  const { game } = data;

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="w-full max-w-2xl mx-auto space-y-6">
        {/* Game header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold font-serif text-black">
            {game.name}
          </h1>
          <p className="text-sm text-black/50">
            {game.raceDate} &middot; {game.distances.join(", ")}
          </p>
          {game.officialResultsUrl && (
            <a
              href={game.officialResultsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-track-red hover:underline"
            >
              Official results &rarr;
            </a>
          )}
        </div>

        <Leaderboard slug={slug} initialData={data} />
      </div>
    </div>
  );
}
