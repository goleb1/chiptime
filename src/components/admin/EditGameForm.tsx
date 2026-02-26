"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { updateGame } from "@/lib/actions/admin";
import type { ActionResult } from "@/lib/db-utils";
import type { Game } from "@/lib/types";
import { DISTANCE_NAMES } from "@/lib/constants";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type FormState = ActionResult<Game> | null;

async function updateGameAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  return updateGame(formData);
}

interface EditGameFormProps {
  game: Game;
  adminSecret: string;
}

export default function EditGameForm({ game, adminSecret }: EditGameFormProps) {
  const [state, action, pending] = useActionState(updateGameAction, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.success) {
      router.push(`/admin/${adminSecret}/game/${game.slug}`);
    }
  }, [state, router, adminSecret, game.slug]);

  // Format raceStartTime to "YYYY-MM-DDTHH:MM" for datetime-local input
  const defaultDateTime = game.raceStartTime
    ? game.raceStartTime.slice(0, 16)
    : "";

  return (
    <form action={action} className="space-y-6 max-w-lg">
      <input type="hidden" name="gameId" value={game.id} />

      <Input
        id="name"
        name="name"
        label="Race Name"
        placeholder="e.g. Boston Marathon 2025"
        defaultValue={game.name}
        required
      />

      <Input
        id="raceStartTime"
        name="raceStartTime"
        label="Race Start Time"
        type="datetime-local"
        defaultValue={defaultDateTime}
        required
      />

      <Input
        id="raceWebsiteUrl"
        name="raceWebsiteUrl"
        label="Race Website (optional)"
        type="url"
        placeholder="https://example.com/race"
        defaultValue={game.raceWebsiteUrl ?? ""}
      />

      <fieldset>
        <legend className="text-sm font-medium text-black/70 mb-2">
          Distances
        </legend>
        <div className="flex flex-wrap gap-3">
          {DISTANCE_NAMES.map((d) => (
            <label key={d} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                name="distances"
                value={d}
                defaultChecked={game.distances.includes(d)}
                className="rounded"
              />
              {d}
            </label>
          ))}
        </div>
      </fieldset>

      {state && !state.success && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" loading={pending}>
          Save Changes
        </Button>
        <button
          type="button"
          onClick={() => router.push(`/admin/${adminSecret}/game/${game.slug}`)}
          className="rounded-md px-4 py-2 text-sm font-medium text-black/60 hover:text-black transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
