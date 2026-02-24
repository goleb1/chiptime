"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { createAthlete, updateAthlete } from "@/lib/actions/admin";
import type { ActionResult } from "@/lib/db-utils";
import type { Athlete } from "@/lib/types";
import { SUPPORTED_DISTANCES } from "@/lib/constants";
import { secondsToTimeString, timeStringToSeconds } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type FormState = ActionResult<Athlete> | null;

async function createAthleteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return createAthlete(formData);
}

async function updateAthleteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return updateAthlete(formData);
}

interface AthleteFormProps {
  /** Provide to edit an existing athlete; omit for create */
  athlete?: Athlete;
  onDone?: () => void;
  onCancel?: () => void;
}

export default function AthleteForm({ athlete, onDone, onCancel }: AthleteFormProps) {
  const isEdit = !!athlete;

  // PR state: distance name → time string (e.g. "1:42:30") or "" for none
  const [prs, setPrs] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const d of SUPPORTED_DISTANCES) {
      const secs = athlete?.prs?.[d.name];
      init[d.name] = secs ? secondsToTimeString(secs) : "";
    }
    return init;
  });

  const [photoPreview, setPhotoPreview] = useState<string | null>(athlete?.photoUrl ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, action, pending] = useActionState(
    isEdit ? updateAthleteAction : createAthleteAction,
    null
  );

  useEffect(() => {
    if (state?.success) {
      onDone?.();
    }
  }, [state, onDone]);

  function buildPrsJson(): string {
    const result: Record<string, number> = {};
    for (const [dist, val] of Object.entries(prs)) {
      if (!val.trim()) continue;
      try {
        const secs = timeStringToSeconds(val.trim());
        if (secs > 0) result[dist] = secs;
      } catch {
        // ignore invalid entries; server-side validation will catch it
      }
    }
    return JSON.stringify(result);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoPreview(URL.createObjectURL(file));
    }
  }

  return (
    <form
      action={(fd) => {
        // Inject the serialized PRs before submitting
        fd.set("prs", buildPrsJson());
        action(fd);
      }}
      className="space-y-6"
    >
      {isEdit && <input type="hidden" name="athleteId" value={athlete.id} />}

      {/* Name */}
      <Input
        id="athlete-name"
        name="name"
        label="Name"
        placeholder="Athlete name"
        defaultValue={athlete?.name ?? ""}
        required
      />

      {/* Strava URL */}
      <Input
        id="athlete-strava"
        name="stravaUrl"
        label="Strava URL"
        placeholder="https://www.strava.com/athletes/..."
        defaultValue={athlete?.stravaUrl ?? ""}
      />

      {/* Photo upload */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Photo
        </label>
        {photoPreview && (
          <img
            src={photoPreview}
            alt="Athlete photo"
            className="h-20 w-20 rounded-full object-cover border border-gray-200 dark:border-gray-600"
          />
        )}
        <input
          ref={fileInputRef}
          type="file"
          name="photo"
          accept="image/*"
          onChange={handlePhotoChange}
          className="block text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"
        />
        {isEdit && (
          <p className="text-xs text-gray-400">Leave empty to keep the current photo.</p>
        )}
      </div>

      {/* PRs */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Personal Records <span className="font-normal text-gray-400">(H:MM:SS or M:SS — leave blank if unknown)</span>
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SUPPORTED_DISTANCES.map((d) => (
            <div key={d.name} className="flex items-center gap-2">
              <label className="w-32 shrink-0 text-sm text-gray-600 dark:text-gray-400">
                {d.name}
              </label>
              <input
                type="text"
                value={prs[d.name]}
                onChange={(e) => setPrs((prev) => ({ ...prev, [d.name]: e.target.value }))}
                placeholder="—"
                className="w-28 rounded-md border border-gray-300 px-2 py-1.5 text-sm font-mono dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-300"
              />
            </div>
          ))}
        </div>
      </div>

      {state && !state.success && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" loading={pending}>
          {isEdit ? "Save Changes" : "Add Athlete"}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
