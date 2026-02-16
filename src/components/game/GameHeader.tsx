"use client";

import { useState, useEffect } from "react";
import type { Game } from "@/lib/types";

interface GameHeaderProps {
  game: Game;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Deadline passed";

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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        {game.name}
      </h1>
      <p className="text-sm text-gray-500">
        {game.raceDate} &middot; {game.distances.join(", ")}
      </p>
      <p
        className={`text-sm font-medium ${
          deadlinePassed ? "text-red-600" : "text-green-600"
        }`}
      >
        {deadlinePassed
          ? "Prediction deadline has passed"
          : `Time remaining: ${formatCountdown(remaining)}`}
      </p>
    </div>
  );
}
