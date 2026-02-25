"use client";

import { useState } from "react";
import type { Runner, RunnerStatus } from "@/lib/types";
import { enterResult } from "@/lib/actions/admin";
import { secondsToTimeString, timeStringToSeconds } from "@/lib/utils";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";

export default function ResultsEntry({
  runners,
  gameId,
  onMutate,
}: {
  runners: Runner[];
  gameId: string;
  onMutate?: () => void;
}) {
  // Group runners by distance
  const grouped = runners.reduce<Record<string, Runner[]>>((acc, runner) => {
    if (!acc[runner.distance]) acc[runner.distance] = [];
    acc[runner.distance].push(runner);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([distance, distanceRunners]) => (
        <div key={distance}>
          <h3 className="text-sm font-semibold text-black/50 uppercase tracking-wide mb-2">
            {distance}
          </h3>
          <div className="space-y-2">
            {distanceRunners.map((runner) => (
              <RunnerResultRow key={runner.id} runner={runner} gameId={gameId} onMutate={onMutate} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function RunnerResultRow({
  runner,
  gameId,
  onMutate,
}: {
  runner: Runner;
  gameId: string;
  onMutate?: () => void;
}) {
  const [timeStr, setTimeStr] = useState(
    runner.actualTimeSeconds !== null ? secondsToTimeString(runner.actualTimeSeconds) : ""
  );
  const [status, setStatus] = useState<RunnerStatus>(runner.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setLoading(true);
    setError(null);
    setSaved(false);

    let actualTime: number | null = null;
    if (status === "finished") {
      try {
        actualTime = timeStringToSeconds(timeStr);
      } catch {
        setError("Invalid time format. Use H:MM:SS or M:SS.");
        setLoading(false);
        return;
      }
    }

    const result = await enterResult(runner.id, gameId, actualTime, status);
    if (!result.success) {
      setError(result.error);
    } else {
      setSaved(true);
      onMutate?.();
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-black/10 px-4 py-3 bg-white/40">
      <span className="font-medium text-black min-w-[120px]">
        {runner.name}
      </span>

      <StatusBadge status={runner.status} />

      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as RunnerStatus)}
        className="rounded-md border border-black/30 px-2 py-1 text-sm bg-white/60 text-black"
      >
        <option value="registered">Registered</option>
        <option value="finished">Finished</option>
        <option value="dnf">DNF</option>
        <option value="dns">DNS</option>
      </select>

      {status === "finished" && (
        <input
          type="text"
          value={timeStr}
          onChange={(e) => setTimeStr(e.target.value)}
          placeholder="H:MM:SS"
          className="w-28 rounded-md border border-black/30 px-2 py-1 text-sm bg-white/60 text-black"
        />
      )}

      <Button onClick={handleSave} loading={loading} variant="primary">
        Save
      </Button>

      {saved && <span className="text-sm text-green-700">Saved</span>}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
