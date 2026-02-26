"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createGame } from "@/lib/actions/admin";
import type { ActionResult } from "@/lib/db-utils";
import type { Game } from "@/lib/types";
import { DISTANCE_NAMES } from "@/lib/constants";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type FormState = ActionResult<Game> | null;

async function createGameAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  return createGame(formData);
}

export default function CreateGameForm({ adminSecret }: { adminSecret: string }) {
  const [state, action, pending] = useActionState(createGameAction, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.success) {
      router.push(`/admin/${adminSecret}/game/${state.data.slug}`);
    }
  }, [state, router, adminSecret]);

  return (
    <form action={action} className="space-y-6 max-w-lg">
      <Input id="name" name="name" label="Game Name" placeholder="e.g. Boston Marathon 2025" required />

      <Input
        id="raceStartTime"
        name="raceStartTime"
        label="Race Start Time"
        type="datetime-local"
        required
      />

      <Input
        id="raceWebsiteUrl"
        name="raceWebsiteUrl"
        label="Race Website (optional)"
        type="url"
        placeholder="https://example.com/race"
      />

      <fieldset>
        <legend className="text-sm font-medium text-black/70 mb-2">
          Distances
        </legend>
        <div className="flex flex-wrap gap-3">
          {DISTANCE_NAMES.map((d) => (
            <label key={d} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="distances" value={d} className="rounded" />
              {d}
            </label>
          ))}
        </div>
      </fieldset>

      {state && !state.success && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <Button type="submit" loading={pending}>
        Create Game
      </Button>
    </form>
  );
}
