import Link from "next/link";
import { createAdminClient } from "@/lib/supabase";
import { mapGameRow } from "@/lib/db-utils";
import StatusBadge from "@/components/ui/StatusBadge";
import type { Game } from "@/lib/types";

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  const db = createAdminClient();

  const { data: rows } = await db
    .from("games")
    .select("*")
    .order("created_at", { ascending: false });

  const games = (rows || []).map(mapGameRow);
  const active = games.filter((g) => g.status !== "finalized");
  const past = games.filter((g) => g.status === "finalized");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Dashboard
        </h1>
        <Link
          href={`/admin/${secret}/create`}
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Create Game
        </Link>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
          Active Games
        </h2>
        {active.length === 0 ? (
          <p className="text-sm text-gray-500">No active games.</p>
        ) : (
          <div className="space-y-3">
            {active.map((game) => (
              <GameCard key={game.id} game={game} secret={secret} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
            Past Games
          </h2>
          <div className="space-y-3">
            {past.map((game) => (
              <GameCard key={game.id} game={game} secret={secret} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function GameCard({ game, secret }: { game: Game; secret: string }) {
  return (
    <Link
      href={`/admin/${secret}/game/${game.slug}`}
      className="block rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-400 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-gray-100">{game.name}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {game.raceDate} &middot; {game.distances.join(", ")}
          </p>
          <p className="text-xs text-gray-400 mt-1 font-mono">
            /game/{game.slug}
          </p>
        </div>
        <StatusBadge status={game.status} />
      </div>
    </Link>
  );
}
