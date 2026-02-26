import Image from "next/image";
import { createAdminClient } from "@/lib/supabase";
import { mapGameRow } from "@/lib/db-utils";
import HomepageGameBrowser from "@/components/HomepageGameBrowser";
import type { Game } from "@/lib/types";

export const revalidate = 60; // ISR: revalidate at most every 60 seconds

async function getHomeGames(): Promise<{ upcoming: Game[]; active: Game[]; past: Game[] }> {
  const db = createAdminClient();
  const { data: rows } = await db
    .from("games")
    .select("*")
    .eq("show_on_homepage", true)
    .order("race_date", { ascending: true });

  const games = (rows || []).map(mapGameRow);

  const upcoming = games.filter(
    (g) => g.status === "setup" || g.status === "predictions_open"
  );
  const active = games.filter(
    (g) => g.status === "predictions_locked" || g.status === "results_entering"
  );
  const past = games.filter((g) => g.status === "finalized");

  return { upcoming, active, past };
}

export default async function Home() {
  const { upcoming, active, past } = await getHomeGames();
  const hasAnyGames = upcoming.length + active.length + past.length > 0;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-6 py-12">
      <main className="flex w-full max-w-lg flex-col items-center gap-12 text-center">
        {/* Logo / Hero */}
        <div className="flex flex-col items-center gap-5">
          <Image
            src="/chiptime.svg"
            alt="Chiptime logo"
            width={96}
            height={110}
            priority
          />
          <h1 className="text-5xl font-bold font-serif tracking-tight text-black sm:text-6xl">
            Chiptime
          </h1>
          <p className="text-lg text-black/60">
            Predict race times. Compete with friends. Earn awards.
          </p>
        </div>

        {/* How it works */}
        <div className="grid w-full gap-6 sm:grid-cols-3">
          <div className="flex flex-col items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-track-red text-lg font-bold text-white">
              1
            </span>
            <h3 className="text-sm font-semibold text-black">Predict</h3>
            <p className="text-xs text-black/50">
              Guess each runner&apos;s finish time before the race.
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-track-red text-lg font-bold text-white">
              2
            </span>
            <h3 className="text-sm font-semibold text-black">Watch</h3>
            <p className="text-xs text-black/50">
              Cheer on the runners as results come in live.
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-track-red text-lg font-bold text-white">
              3
            </span>
            <h3 className="text-sm font-semibold text-black">Celebrate</h3>
            <p className="text-xs text-black/50">
              See scores, earn awards, and claim bragging rights.
            </p>
          </div>
        </div>

        {/* Game browser (only shown when there are home-visible games) */}
        {hasAnyGames && (
          <div className="w-full text-left">
            <h2 className="mb-4 font-serif text-lg font-semibold text-black">
              Games
            </h2>
            <HomepageGameBrowser upcoming={upcoming} active={active} past={past} />
          </div>
        )}

        <p className="text-xs text-black/40">
          Ask the game organizer for a link to join.
        </p>
      </main>
    </div>
  );
}
