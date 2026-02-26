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
import { LEADERBOARD_REALTIME_FALLBACK_MS, SUPPORTED_DISTANCES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { formatErrorPercentage } from "@/lib/utils";
import AwardBadge from "./AwardBadge";
import DigitalTime from "@/components/ui/DigitalTime";

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
    const isLive =
      data.status === "results_entering" || data.status === "predictions_locked";
    if (!isLive) return;

    const gameId = data.game.id;

    // Subscribe to runner changes — fires immediately when admin saves a result
    const channel = supabase
      .channel(`game-runners-${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "runners", filter: `game_id=eq.${gameId}` },
        () => { fetchData(); }
      )
      .subscribe();

    // Fallback poll in case Realtime connection drops
    const fallback = setInterval(fetchData, LEADERBOARD_REALTIME_FALLBACK_MS);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(fallback);
    };
  }, [data.status, data.game.id, fetchData]);

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

  function rankDisplay(rank: number | null): string {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return rank?.toString() ?? "—";
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold font-serif text-black">
          Leaderboard
        </h2>
        {isLive && (
          <span className="text-xs text-gold animate-pulse">
            Live
          </span>
        )}
        {isFinalized && (
          <span className="text-xs text-green-700 font-medium">
            Final
          </span>
        )}
      </div>

      {data.guessers.length === 0 ? (
        <p className="text-black/50 text-sm">No predictions submitted yet.</p>
      ) : (
        <div className="border border-black/10 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[2rem_1fr_auto_3.5rem_2rem] gap-2 px-4 py-2 bg-black/5 text-xs font-medium text-black/50 uppercase tracking-wide">
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
                className="border-t border-black/10"
              >
                {/* Main row */}
                <button
                  onClick={() => toggleExpanded(guesser.id)}
                  className="w-full grid grid-cols-[2rem_1fr_auto_3.5rem_2rem] gap-2 px-4 py-3 text-left hover:bg-black/5 transition-colors"
                >
                  <span className={`font-medium leading-none ${guesser.rank != null && guesser.rank <= 3 ? "text-base" : "text-sm text-black/40"}`}>
                    {rankDisplay(guesser.rank)}
                  </span>
                  <span className="text-sm font-medium text-black truncate min-w-0">
                    {guesser.name}
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    {awards.map((a, i) => (
                      <AwardBadge key={`${a.guesserId}-${a.awardType}-${i}`} awardType={a.awardType} />
                    ))}
                  </span>
                  <span className="text-sm text-right text-black/70 font-mono">
                    {guesser.totalScore ?? "—"}
                  </span>
                  <span className="text-right text-xs text-black/40">
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-3 bg-black/5">
                    {/* Column headers — desktop only */}
                    <div className="hidden sm:grid sm:grid-cols-[1fr_5rem_5rem_4rem_3.5rem] sm:gap-2 text-[10px] uppercase tracking-wider pb-1.5 mb-0.5 border-b border-black/10">
                      <span className="text-black/30">Runner</span>
                      <span className="text-right text-[#b07828]">Guess</span>
                      <span className="text-right text-[#22a85a]">Result</span>
                      <span className="text-right text-black/30">Error</span>
                      <span className="text-right text-black/30">Pts</span>
                    </div>

                    <div className="space-y-1 mt-1">
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
                            className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs items-center py-1.5 border-b border-black/10 last:border-b-0 sm:grid-cols-[1fr_5rem_5rem_4rem_3.5rem] sm:gap-2 sm:py-1"
                          >
                            {/* Runner name + distance */}
                            <span className="text-black/70 truncate col-span-2 sm:col-span-1">
                              {runner.name}
                              <span className="text-black/40 ml-1">
                                ({runner.distance})
                              </span>
                              {pred.dnfBadge && (
                                <span
                                  className="ml-1 text-track-red"
                                  title="DNF Call"
                                >
                                  DNF
                                </span>
                              )}
                            </span>

                            {/* Predicted time */}
                            <span className="sm:text-right">
                              <span className="text-[10px] text-[#b07828] sm:hidden">Guess </span>
                              <DigitalTime seconds={pred.predictedTimeSeconds} variant="predicted" />
                            </span>

                            {/* Actual time */}
                            <span className="text-right sm:text-right">
                              <span className="text-[10px] text-[#22a85a] sm:hidden">Result </span>
                              {!hasResult ? (
                                <DigitalTime seconds={null} variant="actual" />
                              ) : isDnf ? (
                                <span className="text-track-red font-medium">DNF</span>
                              ) : (
                                <DigitalTime seconds={runner.actualTimeSeconds!} variant="actual" />
                              )}
                            </span>

                            {/* Error % */}
                            <span className="text-black/50 sm:text-right">
                              <span className="text-black/40 sm:hidden">Err: </span>
                              {pred.errorPercentage != null
                                ? formatErrorPercentage(pred.errorPercentage)
                                : "—"}
                            </span>

                            {/* Score */}
                            <span className="text-right font-mono font-medium text-black/70">
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
