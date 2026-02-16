"use client";

import { useState, useMemo } from "react";
import type { Game, Runner } from "@/lib/types";
import { submitPredictions } from "@/lib/actions/game";
import { getDefaultTimeForDistance } from "@/lib/utils";
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

  const deadlinePassed = new Date() >= new Date(game.predictionDeadline);

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
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg space-y-6 py-8">
        <GameHeader game={game} />
        <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 p-6 text-center space-y-2">
          <p className="text-lg font-semibold text-green-800 dark:text-green-300">
            Predictions submitted!
          </p>
          <p className="text-sm text-green-700 dark:text-green-400">
            Good luck, {guesserName}! Check back after the race to see results.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 py-8">
      <GameHeader game={game} />

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-3">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
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
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {group.distance}
          </h2>
          {group.runners.map((runner) => (
            <div
              key={runner.id}
              className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {runner.name}
                  </p>
                  {runner.notes && (
                    <p className="text-xs text-gray-500">{runner.notes}</p>
                  )}
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
                  className="rounded border-gray-300"
                />
                <span className="text-gray-700 dark:text-gray-300">
                  DNF Risk Badge
                </span>
              </label>
            </div>
          ))}
        </section>
      ))}

      <p className="text-sm text-gray-500">
        DNF badges used: {dnfCount} of {MAX_DNF_BADGES_PER_GUESSER}
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
