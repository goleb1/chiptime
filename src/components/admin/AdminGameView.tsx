"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Game, Runner } from "@/lib/types";
import { ADMIN_POLL_INTERVAL_MS } from "@/lib/constants";
import { formatRaceDate, formatRaceTime } from "@/lib/utils";
import GameStatusBar from "./GameStatusBar";
import GameVisibilityToggle from "./GameVisibilityToggle";
import RunnerForm from "./RunnerForm";
import RunnerList from "./RunnerList";
import ResultsEntry from "./ResultsEntry";

interface AdminGameViewProps {
  initialGame: Game;
  initialRunners: Runner[];
  initialGuesserCount: number;
  secret: string;
}

export default function AdminGameView({
  initialGame,
  initialRunners,
  initialGuesserCount,
  secret,
}: AdminGameViewProps) {
  const [game, setGame] = useState(initialGame);
  const [runners, setRunners] = useState(initialRunners);
  const [guesserCount, setGuesserCount] = useState(initialGuesserCount);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/games/${game.slug}`);
      if (res.ok) {
        const json = await res.json();
        setGame(json.game);
        setRunners(json.runners);
        setGuesserCount(json.guesserCount);
      }
    } catch {
      // Silently ignore poll failures
    }
  }, [game.slug]);

  useEffect(() => {
    if (game.status === "finalized") return;

    const interval = setInterval(fetchData, ADMIN_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [game.status, fetchData]);

  // Immediate refresh after any mutation (add runner, enter result, status change)
  const onMutate = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const shareUrl = `/game/${game.slug}`;
  const showGuesserCount =
    game.status === "predictions_open" ||
    game.status === "predictions_locked" ||
    game.status === "results_entering";

  const showResultsEntry =
    game.status === "results_entering" || game.status === "predictions_locked";

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold font-serif text-black">
            {game.name}
          </h1>
          <Link
            href={`/admin/${secret}/game/${game.slug}/edit`}
            className="shrink-0 rounded-md border border-black/20 px-3 py-1.5 text-sm font-medium text-black/60 hover:border-black/40 hover:text-black transition-colors"
          >
            Edit Settings
          </Link>
        </div>
        <p className="text-sm text-black/50 mt-1">
          {formatRaceDate(game.raceDate)}
          {" · "}
          {formatRaceTime(game.raceStartTime)}
          {game.location && ` · ${game.location}`}
          {" · "}
          {game.distances.join(", ")}
        </p>
        <div className="flex flex-wrap items-center gap-3 mt-1">
          <p className="text-sm text-black/40">
            Share link:{" "}
            <code className="bg-black/10 px-1 py-0.5 rounded text-xs">
              {shareUrl}
            </code>
          </p>
          <GameVisibilityToggle gameId={game.id} showOnHomepage={game.showOnHomepage} />
        </div>
        {showGuesserCount && (
          <p className="text-sm text-track-red mt-1">
            {guesserCount} {guesserCount === 1 ? "guesser" : "guessers"} submitted
          </p>
        )}
      </div>

      <GameStatusBar gameId={game.id} status={game.status} onMutate={onMutate} />

      {/* During results entry, show a single combined runners + results view */}
      {showResultsEntry ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold font-serif text-black">
            Runners & Results
          </h2>
          <ResultsEntry runners={runners} gameId={game.id} onMutate={onMutate} />
        </section>
      ) : (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold font-serif text-black">
            Runners
          </h2>

          {game.status === "setup" && (
            <RunnerForm gameId={game.id} distances={game.distances} onMutate={onMutate} />
          )}

          <RunnerList runners={runners} gameId={game.id} gameStatus={game.status} onMutate={onMutate} />
        </section>
      )}

      {game.status === "finalized" && (
        <section>
          <p className="text-green-700 font-medium">
            This race has been finalized. Scores and awards have been computed.
          </p>
        </section>
      )}
    </div>
  );
}
