import Link from "next/link";
import Image from "next/image";
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
import { formatRaceDate, formatRaceTime } from "@/lib/utils";

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
    <div className="min-h-screen bg-cream">
      {/* Sticky brand header */}
      <header className="fixed top-0 inset-x-0 h-11 bg-track-red z-40 flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/chiptime.svg" alt="" width={24} height={28} className="h-7 w-auto" />
          <span className="font-serif italic text-cream font-bold text-lg leading-none">Chiptime</span>
        </Link>
        {game.officialResultsUrl && (
          <a
            href={game.officialResultsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/70 hover:text-white transition-colors"
          >
            Official results →
          </a>
        )}
      </header>

      {/* Content offset for fixed header */}
      <div className="pt-11">
        <div className="w-full max-w-2xl mx-auto">

          {/* Game info block */}
          <div className="px-4 py-3 border-b border-black/10">
            <div className="flex items-start justify-between gap-3">
              <h1 className="font-serif font-bold text-xl text-black leading-tight">
                {game.name}
                <span className="font-sans font-normal text-base text-black/40">
                  {" — "}{game.distances.join(", ")}
                </span>
              </h1>
              {game.raceWebsiteUrl && (
                <a
                  href={game.raceWebsiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Race website"
                  className="text-black/35 hover:text-track-red shrink-0 mt-0.5 transition-colors"
                >
                  <GlobeIcon className="h-5 w-5" />
                </a>
              )}
            </div>
            <p className="text-sm text-black/50 mt-1">
              {formatRaceDate(game.raceDate)}
              {" · "}
              {formatRaceTime(game.raceStartTime)}
              {game.location && ` · ${game.location}`}
            </p>
          </div>

          {/* Leaderboard */}
          <div className="px-4 py-6">
            <Leaderboard slug={slug} initialData={data} />
          </div>

        </div>
      </div>
    </div>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.038 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.038-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );
}
