"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Game, Runner } from "@/lib/types";
import { submitPredictions } from "@/lib/actions/game";
import { getDefaultTimeForDistance, secondsToTimeString, findBestPr } from "@/lib/utils";
import { MAX_DNF_BADGES_PER_GUESSER, SUPPORTED_DISTANCES } from "@/lib/constants";
import TimeInput from "./TimeInput";
import GameHeader from "./GameHeader";
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
    // Sort within each group by sortOrder
    for (const dist of Object.keys(groups)) {
      groups[dist].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    // Sort group keys by SUPPORTED_DISTANCES index
    const sortedDistances = Object.keys(groups).sort((a, b) => {
      const ai = SUPPORTED_DISTANCES.findIndex((d) => d.name === a);
      const bi = SUPPORTED_DISTANCES.findIndex((d) => d.name === b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
    return sortedDistances.map((dist) => ({ distance: dist, runners: groups[dist] }));
  }, [runners]);

  const deadlinePassed = game.predictionDeadline
    ? new Date() >= new Date(game.predictionDeadline)
    : false;

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

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg space-y-6 py-8">
        <GameHeader game={game} />
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center space-y-2">
          <p className="text-lg font-semibold text-green-800">
            Predictions submitted!
          </p>
          <p className="text-sm text-green-700">
            Redirecting to results...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 py-8">
      <GameHeader game={game} />

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div>
        <Input
          id="guesserName"
          label="Your Name"
          placeholder="Enter your name"
          value={guesserName}
          onChange={(e) => setGuesserName(e.target.value)}
          disabled={deadlinePassed}
        />
      </div>

      {groupedRunners.map((group) => (
        <section key={group.distance} className="space-y-4">
          <h2 className="text-lg font-semibold font-serif text-black">
            {group.distance}
          </h2>
          {group.runners.map((runner) => (
            <div
              key={runner.id}
              className="rounded-lg border border-black/15 p-4 space-y-3 bg-white/40"
            >
              <div className="flex items-start gap-3">
                {runner.athlete && (
                  runner.athlete.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={runner.athlete.photoUrl}
                      alt={runner.name}
                      className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-black/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-black/50">
                        {runner.name[0]?.toUpperCase()}
                      </span>
                    </div>
                  )
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-black">{runner.name}</p>
                    {(runner.athlete?.gender || runner.athlete?.birthYear) && (
                      <span className="text-xs font-mono text-black/50">
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

              <TimeInput
                hours={times[runner.id].hours}
                minutes={times[runner.id].minutes}
                seconds={times[runner.id].seconds}
                onChange={() => {
                  // Total seconds computed via onFieldChange
                }}
                onFieldChange={(field, value) => {
                  setTimes((prev) => ({
                    ...prev,
                    [runner.id]: { ...prev[runner.id], [field]: value },
                  }));
                }}
                disabled={deadlinePassed}
              />

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={dnfBadges[runner.id]}
                  disabled={
                    deadlinePassed ||
                    (!dnfBadges[runner.id] && dnfCount >= MAX_DNF_BADGES_PER_GUESSER)
                  }
                  onChange={(e) =>
                    setDnfBadges((prev) => ({
                      ...prev,
                      [runner.id]: e.target.checked,
                    }))
                  }
                  className="rounded border-black/30 accent-track-red"
                />
                <span className="text-black/70">
                  DNF Call
                </span>
              </label>
            </div>
          ))}
        </section>
      ))}

      <p className="text-sm text-black/50">
        DNF Calls used: {dnfCount} of {MAX_DNF_BADGES_PER_GUESSER}
      </p>

      <Button
        onClick={handleSubmit}
        disabled={!canSubmit}
        loading={submitting}
        className="w-full"
      >
        Submit Predictions
      </Button>
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
