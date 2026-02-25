"use client";

import { useState, useEffect, useCallback } from "react";
import { getAthletes, deleteAthlete } from "@/lib/actions/admin";
import type { Athlete } from "@/lib/types";
import { SUPPORTED_DISTANCES } from "@/lib/constants";
import { secondsToTimeString } from "@/lib/utils";
import AthleteForm from "@/components/admin/AthleteForm";
import Button from "@/components/ui/Button";

export default function AthletesPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Athlete | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchAthletes = useCallback(async () => {
    const data = await getAthletes();
    setAthletes(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAthletes();
  }, [fetchAthletes]);

  async function handleDelete(athlete: Athlete) {
    if (!confirm(`Delete ${athlete.name}? This cannot be undone.`)) return;
    setDeleting(athlete.id);
    await deleteAthlete(athlete.id);
    setDeleting(null);
    fetchAthletes();
  }

  function prCount(athlete: Athlete) {
    return Object.keys(athlete.prs).length;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-serif text-black">Athletes</h1>
        {!showCreate && !editing && (
          <Button onClick={() => setShowCreate(true)}>Add Athlete</Button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-lg border border-black/10 bg-white/50 p-6 space-y-4">
          <h2 className="text-lg font-semibold font-serif text-black">New Athlete</h2>
          <AthleteForm
            onDone={() => { setShowCreate(false); fetchAthletes(); }}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <div className="rounded-lg border border-track-red/30 bg-white/50 p-6 space-y-4">
          <h2 className="text-lg font-semibold font-serif text-black">
            Edit — {editing.name}
          </h2>
          <AthleteForm
            athlete={editing}
            onDone={() => { setEditing(null); fetchAthletes(); }}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {/* Athlete list */}
      {loading ? (
        <p className="text-sm text-black/50">Loading…</p>
      ) : athletes.length === 0 ? (
        <p className="text-sm text-black/50">No athletes yet. Add one to get started.</p>
      ) : (
        <div className="space-y-3">
          {athletes.map((athlete) => (
            <div
              key={athlete.id}
              className="rounded-lg border border-black/10 bg-white/50 p-4 flex items-center gap-4"
            >
              {/* Photo */}
              {athlete.photoUrl ? (
                <img
                  src={athlete.photoUrl}
                  alt={athlete.name}
                  className="h-12 w-12 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-black/10 flex items-center justify-center shrink-0">
                  <span className="text-lg font-semibold text-black/40">
                    {athlete.name[0]?.toUpperCase()}
                  </span>
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-black">{athlete.name}</p>
                  {athlete.stravaUrl && (
                    <a
                      href={athlete.stravaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Strava profile"
                      className="text-orange-500 hover:text-orange-600"
                    >
                      <StravaIcon className="h-4 w-4" />
                    </a>
                  )}
                </div>
                <p className="text-xs text-black/50 mt-0.5">
                  {prCount(athlete) > 0
                    ? `${prCount(athlete)} PR${prCount(athlete) !== 1 ? "s" : ""} recorded · ` +
                      SUPPORTED_DISTANCES
                        .filter((d) => athlete.prs[d.name])
                        .map((d) => `${d.name}: ${secondsToTimeString(athlete.prs[d.name])}`)
                        .join(" · ")
                    : "No PRs recorded"}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  onClick={() => { setShowCreate(false); setEditing(athlete); }}
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  loading={deleting === athlete.id}
                  onClick={() => handleDelete(athlete)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StravaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  );
}
