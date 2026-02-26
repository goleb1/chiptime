"use client";

import { useState } from "react";
import Link from "next/link";
import type { Game, GameStatus } from "@/lib/types";

interface Props {
  upcoming: Game[];
  active: Game[];
  past: Game[];
}

type Tab = "upcoming" | "active" | "past";

function defaultTab(upcoming: Game[], active: Game[]): Tab {
  if (active.length > 0) return "active";
  if (upcoming.length > 0) return "upcoming";
  return "past";
}

function formatDate(isoDate: string): string {
  // isoDate is YYYY-MM-DD
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function GameCta({ game }: { game: Game }) {
  const status: GameStatus = game.status;

  if (status === "setup") {
    return (
      <span className="shrink-0 rounded-md bg-black/10 px-4 py-2.5 text-sm font-medium text-black/40">
        Coming Soon
      </span>
    );
  }

  if (status === "predictions_open") {
    return (
      <Link
        href={`/game/${game.slug}`}
        className="shrink-0 rounded-md bg-track-red px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#5a1a1c] active:bg-[#4a1618]"
      >
        Join →
      </Link>
    );
  }

  if (status === "predictions_locked" || status === "results_entering") {
    return (
      <Link
        href={`/game/${game.slug}`}
        className="shrink-0 rounded-md bg-track-red px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#5a1a1c] active:bg-[#4a1618]"
      >
        Leaderboard →
      </Link>
    );
  }

  if (status === "finalized") {
    return (
      <Link
        href={`/results/${game.slug}`}
        className="shrink-0 rounded-md bg-gold px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#9a7a3f] active:bg-[#8a6a35]"
      >
        See Results →
      </Link>
    );
  }

  return null;
}

function GameCard({ game }: { game: Game }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-black/10 bg-white/50 p-4">
      <div className="min-w-0">
        <p className="font-medium text-black leading-snug">{game.name}</p>
        <p className="mt-0.5 text-sm text-black/50">
          {formatDate(game.raceDate)}
          {game.distances.length > 0 && (
            <> &middot; {game.distances.join(", ")}</>
          )}
        </p>
      </div>
      <GameCta game={game} />
    </div>
  );
}

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-track-red text-white"
          : "bg-black/5 text-black/60 hover:bg-black/10 hover:text-black"
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 py-0.5 text-xs font-bold leading-none ${
          active ? "bg-white/20 text-white" : "bg-black/10 text-black/50"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

export default function HomepageGameBrowser({ upcoming, active, past }: Props) {
  const [tab, setTab] = useState<Tab>(() => defaultTab(upcoming, active));

  const games: Record<Tab, Game[]> = { upcoming, active, past };
  const current = games[tab];

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        <TabButton
          label="Upcoming"
          count={upcoming.length}
          active={tab === "upcoming"}
          onClick={() => setTab("upcoming")}
        />
        <TabButton
          label="Active"
          count={active.length}
          active={tab === "active"}
          onClick={() => setTab("active")}
        />
        <TabButton
          label="Past"
          count={past.length}
          active={tab === "past"}
          onClick={() => setTab("past")}
        />
      </div>

      {current.length === 0 ? (
        <p className="py-4 text-center text-sm text-black/40">
          {tab === "upcoming" && "No upcoming games yet."}
          {tab === "active" && "No races in progress right now."}
          {tab === "past" && "No completed games yet."}
        </p>
      ) : (
        <div className="space-y-3">
          {current.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}
