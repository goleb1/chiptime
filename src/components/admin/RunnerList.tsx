"use client";

import { useState } from "react";
import type { Runner, GameStatus } from "@/lib/types";
import { deleteRunner } from "@/lib/actions/admin";
import StatusBadge from "@/components/ui/StatusBadge";
import Button from "@/components/ui/Button";
import { secondsToTimeString } from "@/lib/utils";

export default function RunnerList({
  runners,
  gameId,
  gameStatus,
}: {
  runners: Runner[];
  gameId: string;
  gameStatus: GameStatus;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Group runners by distance
  const grouped = runners.reduce<Record<string, Runner[]>>((acc, runner) => {
    if (!acc[runner.distance]) acc[runner.distance] = [];
    acc[runner.distance].push(runner);
    return acc;
  }, {});

  async function handleDelete(runnerId: string) {
    if (!confirm("Delete this runner?")) return;
    setDeletingId(runnerId);
    await deleteRunner(runnerId, gameId);
    setDeletingId(null);
  }

  if (runners.length === 0) {
    return <p className="text-sm text-gray-500">No runners yet. Add one above.</p>;
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([distance, distanceRunners]) => (
        <div key={distance}>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {distance}
          </h3>
          <div className="divide-y divide-gray-200 dark:divide-gray-700 border rounded-md border-gray-200 dark:border-gray-700">
            {distanceRunners.map((runner) => (
              <div
                key={runner.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {runner.name}
                  </span>
                  <StatusBadge status={runner.status} />
                  {runner.actualTimeSeconds !== null && (
                    <span className="text-sm text-gray-500">
                      {secondsToTimeString(runner.actualTimeSeconds)}
                    </span>
                  )}
                  {runner.notes && (
                    <span className="text-sm text-gray-400">{runner.notes}</span>
                  )}
                </div>

                {gameStatus === "setup" && (
                  <Button
                    variant="ghost"
                    onClick={() => handleDelete(runner.id)}
                    loading={deletingId === runner.id}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
