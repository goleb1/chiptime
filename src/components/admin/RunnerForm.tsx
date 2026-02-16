"use client";

import { useActionState, useEffect, useRef } from "react";
import { addRunner } from "@/lib/actions/admin";
import type { ActionResult } from "@/lib/db-utils";
import type { Runner } from "@/lib/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type FormState = ActionResult<Runner> | null;

async function addRunnerAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  return addRunner(formData);
}

export default function RunnerForm({
  gameId,
  distances,
  onMutate,
}: {
  gameId: string;
  distances: string[];
  onMutate?: () => void;
}) {
  const [state, action, pending] = useActionState(addRunnerAction, null);
  const prevStateRef = useRef(state);

  useEffect(() => {
    if (state && state !== prevStateRef.current && state.success) {
      onMutate?.();
    }
    prevStateRef.current = state;
  }, [state, onMutate]);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="gameId" value={gameId} />

      <Input id="runner-name" name="name" label="Runner Name" placeholder="Name" required />

      <div className="flex flex-col gap-1">
        <label htmlFor="runner-distance" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Distance
        </label>
        <select
          id="runner-distance"
          name="distance"
          required
          className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        >
          {distances.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <Input id="runner-notes" name="notes" label="Notes" placeholder="Optional" />

      <Button type="submit" loading={pending}>
        Add Runner
      </Button>

      {state && !state.success && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
    </form>
  );
}
