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
import { LEADERBOARD_REALTIME_FALLBACK_MS, SUPPORTED_DISTANCES, AWARD_DEFINITIONS } from "@/lib/constants";
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
        <>
        <div className="border border-black/10 rounded-lg overflow-hidden">
          {/* Header — 4 columns: rank | name | score | chevron */}
          <div className="grid grid-cols-[2rem_1fr_4rem_1.5rem] gap-2 px-4 py-2 bg-black/5 text-xs font-medium text-black/50 uppercase tracking-wide">
            <span className="text-center">#</span>
            <span>Name</span>
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
                {/* Main row — same 4-column grid as header */}
                <button
                  onClick={() => toggleExpanded(guesser.id)}
                  className="w-full grid grid-cols-[2rem_1fr_4rem_1.5rem] gap-2 px-4 py-3 text-left hover:bg-black/5 transition-colors items-start"
                >
                  {/* Rank — centered so medals + numbers sit under # */}
                  <span className="flex items-center justify-center pt-0.5">
                    <span className={`font-medium leading-none ${guesser.rank != null && guesser.rank <= 3 ? "text-base" : "text-xs text-black/40"}`}>
                      {rankDisplay(guesser.rank)}
                    </span>
                  </span>
                  {/* Name — always single line, no badge clutter */}
                  <p className="text-sm font-medium text-black truncate min-w-0">
                    {guesser.name}
                  </p>
                  <span className="text-sm text-right text-black/70 font-mono pt-0.5">
                    {guesser.totalScore ?? "—"}
                  </span>
                  <span className="text-right text-xs text-black/40 pt-1">
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-1 bg-black/5">
                    {/* Awards — shown here so the main row stays clean */}
                    {awards.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap py-2.5 border-b border-black/10">
                        {awards.map((a, i) => (
                          <AwardBadge key={`${a.guesserId}-${a.awardType}-${i}`} awardType={a.awardType} />
                        ))}
                      </div>
                    )}
                    <div className="divide-y divide-black/10">
                      {sortedRunners.map((runner) => {
                        const pred = predictions.find(
                          (p) => p.runnerId === runner.id
                        );
                        if (!pred) return null;

                        const hasResult =
                          runner.status === "finished" || runner.status === "dnf";
                        const isDnf = runner.status === "dnf";

                        return (
                          <div key={runner.id} className="py-3">
                            {/* Runner name + tags */}
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className="text-xs font-semibold text-black/80 truncate">
                                {runner.name}
                              </span>
                              <span className="text-[10px] text-black/35 shrink-0">
                                ({runner.distance})
                              </span>
                              {pred.dnfBadge && (
                                <span className="text-[10px] font-semibold text-track-red shrink-0">
                                  DNF Call
                                </span>
                              )}
                            </div>

                            {/* Guess → Result + Points */}
                            <div className="flex items-end gap-2">
                              {/* Guess */}
                              <div className="shrink-0">
                                <p className="text-[9px] uppercase tracking-wider text-gold mb-1">
                                  Guess
                                </p>
                                <DigitalTime
                                  seconds={pred.predictedTimeSeconds}
                                  variant="predicted"
                                />
                              </div>

                              <span className="text-black/20 text-xs pb-1 shrink-0">→</span>

                              {/* Result */}
                              <div className="shrink-0">
                                <p className="text-[9px] uppercase tracking-wider text-[#22a85a] mb-1">
                                  Result
                                </p>
                                {!hasResult ? (
                                  <DigitalTime seconds={null} variant="actual" />
                                ) : isDnf ? (
                                  <div className="inline-flex items-center h-[26px]">
                                    <span className="text-sm font-bold text-track-red font-mono">
                                      DNF
                                    </span>
                                  </div>
                                ) : (
                                  <DigitalTime
                                    seconds={runner.actualTimeSeconds!}
                                    variant="actual"
                                  />
                                )}
                              </div>

                              {/* Spacer */}
                              <div className="flex-1 min-w-0" />

                              {/* Points */}
                              <div className="text-right shrink-0">
                                <p className="text-[9px] uppercase tracking-wider text-black/30 mb-1">
                                  Pts
                                </p>
                                <span className="text-base font-mono font-semibold text-black/80">
                                  {pred.score != null ? pred.score : "—"}
                                </span>
                              </div>
                            </div>

                            {/* Error % — shown only when scored */}
                            {pred.errorPercentage != null && (
                              <p className="text-[10px] text-black/40 mt-1.5">
                                {formatErrorPercentage(pred.errorPercentage)} off target
                              </p>
                            )}
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

        {/* Awards key */}
        <details className="mt-5 group">
          <summary className="cursor-pointer list-none flex items-center gap-1 text-xs font-medium text-black/40 uppercase tracking-wider hover:text-black/60 transition-colors select-none">
            <span className="inline-block transition-transform group-open:rotate-90">›</span>
            Awards key
          </summary>
          <div className="mt-2.5 space-y-2">
            {AWARD_DEFINITIONS.map((def) => (
              <div key={def.type} className="flex items-start gap-2.5">
                <span className="text-base leading-none shrink-0 mt-px">{def.icon}</span>
                <p className="text-xs text-black/50 leading-relaxed">
                  <span className="font-semibold text-black/70">{def.label}</span>
                  {" — "}
                  {def.description}
                </p>
              </div>
            ))}
          </div>
        </details>
        </>
      )}
    </div>
  );
}
