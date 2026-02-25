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
        <h1 className="text-2xl font-bold font-serif text-black">
          Dashboard
        </h1>
        <Link
          href={`/admin/${secret}/create`}
          className="inline-flex items-center rounded-md bg-track-red px-4 py-2 text-sm font-medium text-white hover:bg-[#5a1a1c] transition-colors"
        >
          Create Game
        </Link>
      </div>

      <section>
        <h2 className="text-lg font-semibold font-serif text-black mb-3">
          Active Games
        </h2>
        {active.length === 0 ? (
          <p className="text-sm text-black/50">No active games.</p>
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
          <h2 className="text-lg font-semibold font-serif text-black mb-3">
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
      className="block rounded-lg border border-black/10 bg-white/50 p-4 hover:border-track-red/40 hover:bg-white/70 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-black">{game.name}</h3>
          <p className="text-sm text-black/50 mt-1">
            {game.raceDate} &middot; {game.distances.join(", ")}
          </p>
          <p className="text-xs text-black/40 mt-1 font-mono">
            /game/{game.slug}
          </p>
        </div>
        <StatusBadge status={game.status} />
      </div>
    </Link>
  );
}
