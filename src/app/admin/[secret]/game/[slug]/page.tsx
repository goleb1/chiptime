import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase";
import { mapGameRow, mapRunnerRow } from "@/lib/db-utils";
import GameStatusBar from "@/components/admin/GameStatusBar";
import RunnerForm from "@/components/admin/RunnerForm";
import RunnerList from "@/components/admin/RunnerList";
import ResultsEntry from "@/components/admin/ResultsEntry";

export default async function ManageGamePage({
  params,
}: {
  params: Promise<{ secret: string; slug: string }>;
}) {
  const { secret, slug } = await params;
  const db = createAdminClient();

  const { data: gameRow } = await db
    .from("games")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!gameRow) notFound();

  const game = mapGameRow(gameRow);

  const { data: runnerRows } = await db
    .from("runners")
    .select("*")
    .eq("game_id", game.id)
    .order("sort_order", { ascending: true });

  const runners = (runnerRows || []).map(mapRunnerRow);

  const shareUrl = `/game/${game.slug}`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {game.name}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {game.raceDate} &middot; {game.distances.join(", ")}
        </p>
        <p className="text-sm text-gray-400 mt-1">
          Share link:{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-xs">
            {shareUrl}
          </code>
        </p>
      </div>

      <GameStatusBar gameId={game.id} status={game.status} />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          Runners
        </h2>

        {game.status === "setup" && (
          <RunnerForm gameId={game.id} distances={game.distances} />
        )}

        <RunnerList runners={runners} gameId={game.id} gameStatus={game.status} />
      </section>

      {(game.status === "results_entering" || game.status === "predictions_locked") && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Enter Results
          </h2>
          <ResultsEntry runners={runners} gameId={game.id} />
        </section>
      )}

      {game.status === "finalized" && (
        <section>
          <p className="text-green-600 font-medium">
            This game has been finalized. Scores and awards have been computed.
          </p>
        </section>
      )}
    </div>
  );
}
