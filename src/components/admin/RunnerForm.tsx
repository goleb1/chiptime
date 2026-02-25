"use client";

import { useState, useActionState, useEffect, useRef, useCallback } from "react";
import { addRunner, createAthlete, getAthletes } from "@/lib/actions/admin";
import type { ActionResult } from "@/lib/db-utils";
import type { Athlete, Runner } from "@/lib/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type FormState = ActionResult<Runner> | null;

async function addRunnerAction(_prev: FormState, formData: FormData): Promise<FormState> {
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
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loadingAthletes, setLoadingAthletes] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddName, setQuickAddName] = useState("");
  const [quickAddStrava, setQuickAddStrava] = useState("");
  const [quickAddPending, setQuickAddPending] = useState(false);
  const [quickAddError, setQuickAddError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [state, action, pending] = useActionState(addRunnerAction, null);
  const prevStateRef = useRef(state);

  const fetchAthletes = useCallback(async () => {
    const data = await getAthletes();
    setAthletes(data);
    setLoadingAthletes(false);
  }, []);

  useEffect(() => {
    fetchAthletes();
  }, [fetchAthletes]);

  useEffect(() => {
    if (state && state !== prevStateRef.current && state.success) {
      // Reset form
      setSelectedAthlete(null);
      setSearch("");
      onMutate?.();
    }
    prevStateRef.current = state;
  }, [state, onMutate]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = athletes.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleQuickAdd() {
    if (!quickAddName.trim()) return;
    setQuickAddPending(true);
    setQuickAddError(null);
    const fd = new FormData();
    fd.set("name", quickAddName.trim());
    fd.set("stravaUrl", quickAddStrava.trim());
    fd.set("prs", "{}");
    const result = await createAthlete(fd);
    setQuickAddPending(false);
    if (!result.success) {
      setQuickAddError(result.error);
      return;
    }
    // Refresh roster and auto-select the new athlete
    await fetchAthletes();
    setSelectedAthlete(result.data);
    setSearch(result.data.name);
    setShowQuickAdd(false);
    setQuickAddName("");
    setQuickAddStrava("");
  }

  return (
    <div className="space-y-4">
      <form action={action} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="gameId" value={gameId} />
        {selectedAthlete && (
          <input type="hidden" name="athleteId" value={selectedAthlete.id} />
        )}

        {/* Athlete selector */}
        <div className="flex flex-col gap-1 relative" ref={dropdownRef}>
          <label className="text-sm font-medium text-black/70">
            Athlete
          </label>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedAthlete(null);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder={loadingAthletes ? "Loading…" : "Search roster…"}
              disabled={loadingAthletes}
              className="w-48 rounded-md border border-black/30 px-3 py-2 text-sm bg-white/60 text-black"
            />
            {selectedAthlete && (
              <span className="text-green-700 text-xs font-medium">✓</span>
            )}
          </div>

          {/* Dropdown */}
          {showDropdown && !selectedAthlete && search.length > 0 && (
            <div className="absolute top-full left-0 z-50 mt-1 w-60 rounded-md border border-black/10 bg-cream shadow-lg max-h-52 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-3 py-2 text-sm text-black/40">No matches</div>
              ) : (
                filtered.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      setSelectedAthlete(a);
                      setSearch(a.name);
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-black/5 text-black flex items-center gap-2"
                  >
                    {a.photoUrl ? (
                      <img src={a.photoUrl} alt="" className="h-6 w-6 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-black/10 flex items-center justify-center shrink-0 text-xs font-medium text-black/50">
                        {a.name[0]?.toUpperCase()}
                      </div>
                    )}
                    {a.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Distance */}
        <div className="flex flex-col gap-1">
          <label htmlFor="runner-distance" className="text-sm font-medium text-black/70">
            Distance
          </label>
          <select
            id="runner-distance"
            name="distance"
            required
            className="rounded-md border border-black/30 px-3 py-2 text-sm bg-white/60 text-black"
          >
            {distances.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <Input id="runner-notes" name="notes" label="Notes" placeholder="Optional" />

        <Button type="submit" loading={pending} disabled={!selectedAthlete}>
          Add to Race
        </Button>
      </form>

      {state && !state.success && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      {/* Quick-add new athlete */}
      {!showQuickAdd ? (
        <button
          type="button"
          onClick={() => setShowQuickAdd(true)}
          className="text-sm text-track-red hover:underline"
        >
          + Add new athlete to roster
        </button>
      ) : (
        <div className="rounded-md border border-black/10 p-4 space-y-3 bg-white/40">
          <p className="text-sm font-medium text-black/70">Quick-add athlete</p>
          <div className="flex flex-wrap gap-3 items-end">
            <Input
              id="quick-name"
              label="Name"
              placeholder="Name"
              value={quickAddName}
              onChange={(e) => setQuickAddName(e.target.value)}
            />
            <Input
              id="quick-strava"
              label="Strava URL"
              placeholder="Optional"
              value={quickAddStrava}
              onChange={(e) => setQuickAddStrava(e.target.value)}
            />
            <Button loading={quickAddPending} onClick={handleQuickAdd}>
              Create & Select
            </Button>
            <Button
              variant="ghost"
              onClick={() => { setShowQuickAdd(false); setQuickAddError(null); }}
            >
              Cancel
            </Button>
          </div>
          {quickAddError && (
            <p className="text-sm text-red-600">{quickAddError}</p>
          )}
          <p className="text-xs text-black/40">
            PRs and photo can be added later from the Athletes page.
          </p>
        </div>
      )}
    </div>
  );
}
