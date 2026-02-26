"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteGame } from "@/lib/actions/admin";

interface DeleteGameButtonProps {
  gameId: string;
  gameName: string;
}

export default function DeleteGameButton({ gameId, gameName }: DeleteGameButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    startTransition(async () => {
      const result = await deleteGame(gameId);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error ?? "Failed to delete.");
        setConfirming(false);
      }
    });
  }

  if (error) {
    return (
      <span className="text-xs text-red-600" title={error}>
        Error
      </span>
    );
  }

  return (
    <button
      onClick={handleClick}
      onBlur={() => setConfirming(false)}
      disabled={isPending}
      title={confirming ? `Permanently delete "${gameName}"?` : `Delete "${gameName}"`}
      className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
        confirming
          ? "bg-red-600 text-white hover:bg-red-700"
          : "text-black/40 hover:text-red-600"
      } disabled:opacity-50`}
    >
      {isPending ? "Deleting…" : confirming ? "Confirm?" : "Delete"}
    </button>
  );
}
