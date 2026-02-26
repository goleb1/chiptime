"use client";

import { useState, useEffect } from "react";
import type { Game } from "@/lib/types";

interface GameHeaderProps {
  game: Game;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Race has started";

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(" ");
}

export default function GameHeader({ game }: GameHeaderProps) {
  const [remaining, setRemaining] = useState<number>(() =>
    new Date(game.predictionDeadline).getTime() - Date.now()
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(new Date(game.predictionDeadline).getTime() - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [game.predictionDeadline]);

  const deadlinePassed = remaining <= 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold font-serif text-black">
          {game.name}
        </h1>
        {game.raceWebsiteUrl && (
          <a
            href={game.raceWebsiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-track-red hover:underline"
          >
            Race website →
          </a>
        )}
      </div>
      <p className="text-sm text-black/50">
        {game.raceDate} &middot; {game.distances.join(", ")}
      </p>
      <p
        className={`text-sm font-medium ${
          deadlinePassed ? "text-track-red" : "text-green-700"
        }`}
      >
        {deadlinePassed
          ? "Predictions closed"
          : `Race starts in: ${formatCountdown(remaining)}`}
      </p>
    </div>
  );
}
