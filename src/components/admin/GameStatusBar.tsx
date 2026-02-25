"use client";

import { useState } from "react";
import type { GameStatus } from "@/lib/types";
import { updateGameStatus, finalizeGame } from "@/lib/actions/admin";
import StatusBadge from "@/components/ui/StatusBadge";
import Button from "@/components/ui/Button";

const NEXT_STATUS: Partial<Record<GameStatus, { label: string; status: GameStatus }>> = {
  setup: { label: "Open Predictions", status: "predictions_open" },
  predictions_open: { label: "Lock Predictions & Enter Results", status: "results_entering" },
};

export default function GameStatusBar({
  gameId,
  status,
  onMutate,
}: {
  gameId: string;
  status: GameStatus;
  onMutate?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = NEXT_STATUS[status];

  async function handleTransition() {
    if (!next) return;
    setLoading(true);
    setError(null);
    const result = await updateGameStatus(gameId, next.status);
    if (!result.success) setError(result.error);
    setLoading(false);
    onMutate?.();
  }

  async function handleFinalize() {
    if (!confirm("Are you sure you want to finalize this game? This will compute all scores and awards.")) return;
    setLoading(true);
    setError(null);
    const result = await finalizeGame(gameId);
    if (!result.success) setError(result.error);
    setLoading(false);
    onMutate?.();
  }

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <span className="text-sm text-black/50">Status:</span>
        <StatusBadge status={status} />
      </div>

      {next && (
        <Button onClick={handleTransition} loading={loading} variant="primary">
          {next.label}
        </Button>
      )}

      {status === "results_entering" && (
        <Button onClick={handleFinalize} loading={loading} variant="danger">
          Finalize Game
        </Button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
