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

interface PrRow {
  distance: string;
  timeStr: string;
}

interface AthleteFormProps {
  /** Provide to edit an existing athlete; omit for create */
  athlete?: Athlete;
  onDone?: () => void;
  onCancel?: () => void;
}

// Sort PR rows to match SUPPORTED_DISTANCES order
function sortPrRows(rows: PrRow[]): PrRow[] {
  return [...rows].sort((a, b) => {
    const ai = SUPPORTED_DISTANCES.findIndex((d) => d.name === a.distance);
    const bi = SUPPORTED_DISTANCES.findIndex((d) => d.name === b.distance);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

export default function AthleteForm({ athlete, onDone, onCancel }: AthleteFormProps) {
  const isEdit = !!athlete;

  // Only the explicitly-added PRs
  const [prRows, setPrRows] = useState<PrRow[]>(() =>
    sortPrRows(
      Object.entries(athlete?.prs ?? {}).map(([distance, secs]) => ({
        distance,
        timeStr: secondsToTimeString(secs),
      }))
    )
  );

  // "Add PR" input state
  const usedDistances = new Set(prRows.map((r) => r.distance));
  const availableDistances = SUPPORTED_DISTANCES.filter((d) => !usedDistances.has(d.name));
  const [newDist, setNewDist] = useState<string>(availableDistances[0]?.name ?? "");
  const [newTime, setNewTime] = useState("");

  // Keep newDist in sync if rows change and current selection gets used
  useEffect(() => {
    const used = new Set(prRows.map((r) => r.distance));
    const avail = SUPPORTED_DISTANCES.filter((d) => !used.has(d.name));
    if (avail.length > 0 && (!newDist || used.has(newDist))) {
      setNewDist(avail[0].name);
    }
  }, [prRows, newDist]);

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
    for (const { distance, timeStr } of prRows) {
      if (!timeStr.trim()) continue;
      try {
        const secs = timeStringToSeconds(timeStr.trim());
        if (secs > 0) result[distance] = secs;
      } catch {
        // ignore invalid entries
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

  function handleAddPr() {
    if (!newDist) return;
    setPrRows((prev) => sortPrRows([...prev, { distance: newDist, timeStr: newTime }]));
    setNewTime("");
  }

  function handleRemovePr(distance: string) {
    setPrRows((prev) => prev.filter((r) => r.distance !== distance));
  }

  function handleTimeChange(distance: string, value: string) {
    setPrRows((prev) =>
      prev.map((r) => (r.distance === distance ? { ...r, timeStr: value } : r))
    );
  }

  return (
    <form
      action={(fd) => {
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
        <label className="block text-sm font-medium text-black/70">
          Photo
        </label>
        {photoPreview && (
          <img
            src={photoPreview}
            alt="Athlete photo"
            className="h-20 w-20 rounded-full object-cover border border-black/10"
          />
        )}
        <input
          ref={fileInputRef}
          type="file"
          name="photo"
          accept="image/*"
          onChange={handlePhotoChange}
          className="block text-sm text-black/60 file:mr-3 file:rounded-md file:border-0 file:bg-track-red/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-track-red hover:file:bg-track-red/20"
        />
        {isEdit && (
          <p className="text-xs text-black/40">Leave empty to keep the current photo.</p>
        )}
      </div>

      {/* PRs */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-black/70">
          Personal Records
        </p>

        {/* Existing PR rows */}
        {prRows.length > 0 && (
          <div className="space-y-2">
            {prRows.map((row) => (
              <div key={row.distance} className="flex items-center gap-2">
                <span className="w-36 shrink-0 text-sm text-black/60">
                  {row.distance}
                </span>
                <input
                  type="text"
                  value={row.timeStr}
                  onChange={(e) => handleTimeChange(row.distance, e.target.value)}
                  placeholder="H:MM:SS"
                  className="w-28 rounded-md border border-black/30 px-2 py-1.5 text-sm font-mono bg-white/60 text-black"
                />
                <button
                  type="button"
                  onClick={() => handleRemovePr(row.distance)}
                  className="text-black/30 hover:text-red-500 transition-colors text-lg leading-none"
                  title="Remove"
                  aria-label={`Remove ${row.distance} PR`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add PR row */}
        {availableDistances.length > 0 && (
          <div className="flex items-center gap-2 pt-1">
            <select
              value={newDist}
              onChange={(e) => setNewDist(e.target.value)}
              className="rounded-md border border-black/30 px-2 py-1.5 text-sm bg-white/60 text-black"
            >
              {availableDistances.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              placeholder="H:MM:SS"
              className="w-28 rounded-md border border-black/30 px-2 py-1.5 text-sm font-mono bg-white/60 text-black"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddPr();
                }
              }}
            />
            <Button type="button" variant="ghost" onClick={handleAddPr}>
              Add PR
            </Button>
          </div>
        )}

        {prRows.length === 0 && availableDistances.length > 0 && (
          <p className="text-xs text-black/40">No PRs added yet. Use the fields above to add one.</p>
        )}
      </div>

      {state && !state.success && (
        <p className="text-sm text-red-600">{state.error}</p>
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
