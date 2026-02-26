"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Game, Runner } from "@/lib/types";
import { submitPredictions } from "@/lib/actions/game";
import { getDefaultTimeForDistance, secondsToTimeString, findBestPr } from "@/lib/utils";
import { MAX_DNF_BADGES_PER_GUESSER, SUPPORTED_DISTANCES } from "@/lib/constants";
import TimeInput from "./TimeInput";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface PredictionFormProps {
  game: Game;
  runners: Runner[];
}

interface TimeFields {
  hours: number;
  minutes: number;
  seconds: number;
}

function secondsToFields(totalSeconds: number): TimeFields {
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function fieldsToSeconds(f: TimeFields): number {
  return f.hours * 3600 + f.minutes * 60 + f.seconds;
}

function formatCompactCountdown(ms: number): string {
  if (!isFinite(ms) || ms <= 0) return "Closed";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function PredictionForm({ game, runners }: PredictionFormProps) {
  const router = useRouter();
  const [guesserName, setGuesserName] = useState("");
  const [times, setTimes] = useState<Record<string, TimeFields>>(() => {
    const init: Record<string, TimeFields> = {};
    for (const r of runners) {
      init[r.id] = secondsToFields(getDefaultTimeForDistance(r.distance));
    }
    return init;
  });
  const [dnfBadges, setDnfBadges] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const r of runners) {
      init[r.id] = false;
    }
    return init;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Live countdown derived from predictionDeadline (= raceStartTime)
  const [remaining, setRemaining] = useState<number>(() =>
    game.predictionDeadline
      ? new Date(game.predictionDeadline).getTime() - Date.now()
      : Infinity
  );

  useEffect(() => {
    if (!game.predictionDeadline) return;
    const interval = setInterval(() => {
      setRemaining(new Date(game.predictionDeadline).getTime() - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [game.predictionDeadline]);

  const deadlinePassed = remaining <= 0;

  const dnfCount = useMemo(
    () => Object.values(dnfBadges).filter(Boolean).length,
    [dnfBadges]
  );

  // Group runners by distance, sorted by SUPPORTED_DISTANCES order
  const groupedRunners = useMemo(() => {
    const groups: Record<string, Runner[]> = {};
    for (const r of runners) {
      if (!groups[r.distance]) groups[r.distance] = [];
      groups[r.distance].push(r);
    }
    for (const dist of Object.keys(groups)) {
      groups[dist].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    const sortedDistances = Object.keys(groups).sort((a, b) => {
      const ai = SUPPORTED_DISTANCES.findIndex((d) => d.name === a);
      const bi = SUPPORTED_DISTANCES.findIndex((d) => d.name === b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
    return sortedDistances.map((dist) => ({ distance: dist, runners: groups[dist] }));
  }, [runners]);

  const canSubmit =
    guesserName.trim().length > 0 &&
    !submitting &&
    !deadlinePassed;

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);

    const formData = new FormData();
    formData.set("gameId", game.id);
    formData.set("slug", game.slug);
    formData.set("guesserName", guesserName.trim());

    for (const r of runners) {
      formData.set(`time_${r.id}`, String(fieldsToSeconds(times[r.id])));
      formData.set(`dnf_${r.id}`, String(dnfBadges[r.id]));
    }

    const result = await submitPredictions(formData);
    setSubmitting(false);

    if (!result.success) {
      setError(result.error);
    } else {
      setSubmitted(true);
      router.push(`/results/${game.slug}`);
    }
  }

  // ─── Sticky header (shared between submitted + main views) ───
  const stickyHeader = (
    <header className="fixed top-0 inset-x-0 h-11 bg-track-red z-40 flex items-center justify-between px-4">
      <span className="font-mono text-white font-bold text-sm tracking-wide">Chiptime</span>
      <span className="font-mono text-white/80 text-xs">
        {deadlinePassed ? "Closed" : formatCompactCountdown(remaining)}
      </span>
    </header>
  );

  if (submitted) {
    return (
      <div className="min-h-screen bg-cream">
        {stickyHeader}
        <div className="pt-11 flex items-center justify-center min-h-screen">
          <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center space-y-2 mx-4">
            <p className="text-lg font-semibold text-green-800">Predictions submitted!</p>
            <p className="text-sm text-green-700">Redirecting to results…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream pb-24">
      {stickyHeader}

      {/* ─── Scrollable content (offset for fixed header) ─── */}
      <div className="pt-11">

        {/* Game info block */}
        <div className="px-4 py-3 border-b border-black/10 space-y-0.5">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h1 className="text-xl font-bold font-serif text-black leading-tight">
              {game.name}
            </h1>
            {game.raceWebsiteUrl && (
              <a
                href={game.raceWebsiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-track-red hover:underline shrink-0"
              >
                Race website →
              </a>
            )}
          </div>
          <p className="text-xs text-black/50">
            {game.raceDate} &middot; {game.distances.join(", ")}
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-4 mt-3 rounded-md border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Your Name */}
        <div className="px-4 py-3 border-b border-black/10">
          <Input
            id="guesserName"
            label="Your Name"
            placeholder="Enter your name"
            value={guesserName}
            onChange={(e) => setGuesserName(e.target.value)}
            disabled={deadlinePassed}
          />
        </div>

        {/* Runner sections */}
        {groupedRunners.map((group) => (
          <section key={group.distance}>
            {/* Distance divider */}
            <div className="px-4 py-2 bg-black/5 border-b border-black/10">
              <span className="text-xs font-semibold text-black/50 uppercase tracking-wider">
                {group.distance}
              </span>
            </div>

            {group.runners.map((runner) => (
              <div
                key={runner.id}
                className="px-4 py-4 border-b border-black/10 space-y-4"
              >
                {/* Athlete identity row */}
                <div className="flex items-start gap-3">
                  {runner.athlete && (
                    runner.athlete.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={runner.athlete.photoUrl}
                        alt={runner.name}
                        className="h-11 w-11 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-11 w-11 rounded-full bg-black/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-black/50">
                          {runner.name[0]?.toUpperCase()}
                        </span>
                      </div>
                    )
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-black">{runner.name}</p>
                      {(runner.athlete?.gender || runner.athlete?.birthYear) && (
                        <span className="text-xs font-mono text-black/40">
                          {runner.athlete.birthYear
                            ? `${new Date().getFullYear() - runner.athlete.birthYear}${runner.athlete.gender ?? ""}`
                            : runner.athlete.gender}
                        </span>
                      )}
                      {runner.athlete?.stravaUrl && (
                        <a
                          href={runner.athlete.stravaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Strava profile"
                          className="text-orange-500 hover:text-orange-600"
                        >
                          <StravaIcon className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    {runner.notes && (
                      <p className="text-xs text-black/50 mt-0.5">{runner.notes}</p>
                    )}
                    {runner.athlete && (() => {
                      const best = findBestPr(runner.distance, runner.athlete.prs);
                      if (!best) return null;
                      return (
                        <p className="text-xs text-track-red font-medium mt-0.5">
                          {best.isExact
                            ? `PR: ${secondsToTimeString(best.seconds)}`
                            : `PR (${best.distance}): ${secondsToTimeString(best.seconds)}`}
                        </p>
                      );
                    })()}
                  </div>
                </div>

                {/* Time picker — full width */}
                <TimeInput
                  hours={times[runner.id].hours}
                  minutes={times[runner.id].minutes}
                  seconds={times[runner.id].seconds}
                  onChange={() => {}}
                  onFieldChange={(field, value) => {
                    setTimes((prev) => ({
                      ...prev,
                      [runner.id]: { ...prev[runner.id], [field]: value },
                    }));
                  }}
                  disabled={deadlinePassed}
                />

                {/* DNF pill toggle */}
                <button
                  type="button"
                  onClick={() => {
                    if (deadlinePassed) return;
                    if (!dnfBadges[runner.id] && dnfCount >= MAX_DNF_BADGES_PER_GUESSER) return;
                    setDnfBadges((prev) => ({
                      ...prev,
                      [runner.id]: !prev[runner.id],
                    }));
                  }}
                  disabled={
                    deadlinePassed ||
                    (!dnfBadges[runner.id] && dnfCount >= MAX_DNF_BADGES_PER_GUESSER)
                  }
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    dnfBadges[runner.id]
                      ? "bg-track-red text-white border-track-red"
                      : "bg-transparent text-black/50 border-black/25 hover:border-black/50"
                  }`}
                >
                  <span aria-hidden="true">{dnfBadges[runner.id] ? "✕" : "⚑"}</span>
                  <span>DNF Call</span>
                </button>
              </div>
            ))}
          </section>
        ))}

        {/* DNF explainer — shown once after all runners */}
        <p className="px-4 pt-3 pb-6 text-xs text-black/40 leading-relaxed">
          <span className="font-medium text-black/50">DNF Call</span> — predict a runner
          won&apos;t finish the race. You have{" "}
          {MAX_DNF_BADGES_PER_GUESSER - dnfCount} of {MAX_DNF_BADGES_PER_GUESSER} remaining.
        </p>

      </div>

      {/* ─── Fixed bottom submit bar ─── */}
      <div className="fixed bottom-0 inset-x-0 bg-cream border-t border-black/15 px-4 py-3 z-30">
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          loading={submitting}
          className="w-full"
        >
          Submit Predictions
        </Button>
      </div>
    </div>
  );
}

function StravaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  );
}
