"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  Game,
  GameStatus,
  Guesser,
  Prediction,
  Runner,
  Award,
} from "@/lib/types";
import { LEADERBOARD_POLL_INTERVAL_MS, SUPPORTED_DISTANCES } from "@/lib/constants";
import { secondsToTimeString, formatErrorPercentage } from "@/lib/utils";
import AwardBadge from "./AwardBadge";

export interface LeaderboardData {
  game: Game;
  status: GameStatus;
  guessers: Guesser[];
  predictions: Prediction[];
  runners: Runner[];
  awards: Award[];
}

interface LeaderboardProps {
  slug: string;
  initialData: LeaderboardData;
}

export default function Leaderboard({ slug, initialData }: LeaderboardProps) {
  const [data, setData] = useState<LeaderboardData>(initialData);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/${slug}/leaderboard`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Silently ignore poll failures
    }
  }, [slug]);

  // Fetch immediately on mount to replace stale server-rendered data
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (data.status !== "results_entering" && data.status !== "predictions_locked") return;

    const interval = setInterval(fetchData, LEADERBOARD_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [data.status, fetchData]);

  const toggleExpanded = (guesserId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(guesserId)) {
        next.delete(guesserId);
      } else {
        next.add(guesserId);
      }
      return next;
    });
  };

  const getAwardsForGuesser = (guesserId: string) =>
    data.awards.filter((a) => a.guesserId === guesserId);

  const getPredictionsForGuesser = (guesserId: string) =>
    data.predictions.filter((p) => p.guesserId === guesserId);

  // Sort runners by distance order, then sortOrder
  const distanceOrder = new Map(
    SUPPORTED_DISTANCES.map((d, i) => [d.name, i])
  );

  const sortedRunners = [...data.runners].sort((a, b) => {
    const da = distanceOrder.get(a.distance) ?? 999;
    const db = distanceOrder.get(b.distance) ?? 999;
    if (da !== db) return da - db;
    return a.sortOrder - b.sortOrder;
  });

  const isFinalized = data.status === "finalized";
  const isLive = data.status === "results_entering" || data.status === "predictions_locked";

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Leaderboard
        </h2>
        {isLive && (
          <span className="text-xs text-amber-600 dark:text-amber-400 animate-pulse">
            Live — updating every 30s
          </span>
        )}
        {isFinalized && (
          <span className="text-xs text-green-600 dark:text-green-400 font-medium">
            Final
          </span>
        )}
      </div>

      {data.guessers.length === 0 ? (
        <p className="text-gray-500 text-sm">No predictions submitted yet.</p>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[2rem_1fr_auto_3.5rem_2rem] gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            <span>#</span>
            <span>Name</span>
            <span />
            <span className="text-right">Score</span>
            <span />
          </div>

          {/* Rows */}
          {data.guessers.map((guesser) => {
            const awards = getAwardsForGuesser(guesser.id);
            const isExpanded = expandedIds.has(guesser.id);
            const predictions = getPredictionsForGuesser(guesser.id);

            return (
              <div
                key={guesser.id}
                className="border-t border-gray-200 dark:border-gray-700"
              >
                {/* Main row */}
                <button
                  onClick={() => toggleExpanded(guesser.id)}
                  className="w-full grid grid-cols-[2rem_1fr_auto_3.5rem_2rem] gap-2 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {guesser.rank ?? "—"}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate min-w-0">
                    {guesser.name}
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    {awards.map((a, i) => (
                      <AwardBadge key={`${a.guesserId}-${a.awardType}-${i}`} awardType={a.awardType} />
                    ))}
                  </span>
                  <span className="text-sm text-right text-gray-700 dark:text-gray-300 font-mono">
                    {guesser.totalScore ?? "—"}
                  </span>
                  <span className="text-right text-xs text-gray-400">
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-3 bg-gray-50 dark:bg-gray-800/50">
                    <div className="space-y-1">
                      {sortedRunners.map((runner) => {
                        const pred = predictions.find(
                          (p) => p.runnerId === runner.id
                        );
                        if (!pred) return null;

                        const hasResult =
                          runner.status === "finished" || runner.status === "dnf";
                        const isDnf = runner.status === "dnf";

                        return (
                          <div
                            key={runner.id}
                            className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs items-center py-1.5 border-b border-gray-100 dark:border-gray-700/50 last:border-b-0 sm:grid-cols-[1fr_5rem_5rem_4rem_3.5rem] sm:gap-2 sm:py-1"
                          >
                            {/* Runner name + distance */}
                            <span className="text-gray-700 dark:text-gray-300 truncate col-span-2 sm:col-span-1">
                              {runner.name}
                              <span className="text-gray-400 ml-1">
                                ({runner.distance})
                              </span>
                              {pred.dnfBadge && (
                                <span
                                  className="ml-1 text-red-500"
                                  title="DNF Call"
                                >
                                  DNF
                                </span>
                              )}
                            </span>

                            {/* Predicted time */}
                            <span className="text-gray-500 dark:text-gray-400 font-mono sm:text-right">
                              <span className="text-gray-400 sm:hidden">Pred: </span>
                              {secondsToTimeString(pred.predictedTimeSeconds)}
                            </span>

                            {/* Actual time */}
                            <span className="font-mono text-gray-500 dark:text-gray-400 text-right sm:text-right">
                              {!hasResult ? (
                                <span className="text-amber-500 text-[10px]">
                                  Awaiting
                                </span>
                              ) : isDnf ? (
                                <span className="text-red-500">DNF</span>
                              ) : (
                                secondsToTimeString(runner.actualTimeSeconds!)
                              )}
                            </span>

                            {/* Error % */}
                            <span className="text-gray-500 dark:text-gray-400 sm:text-right">
                              <span className="text-gray-400 sm:hidden">Err: </span>
                              {pred.errorPercentage != null
                                ? formatErrorPercentage(pred.errorPercentage)
                                : "—"}
                            </span>

                            {/* Score */}
                            <span className="text-right font-mono font-medium text-gray-700 dark:text-gray-300">
                              {pred.score != null ? pred.score : "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
