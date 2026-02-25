import type { GameStatus, RunnerStatus } from "@/lib/types";

type Status = GameStatus | RunnerStatus;

const statusColors: Record<Status, string> = {
  setup: "bg-black/10 text-black/60",
  predictions_open: "bg-green-100 text-green-800",
  predictions_locked: "bg-gold/20 text-[#7a5c1a]",
  results_entering: "bg-track-red/15 text-track-red",
  finalized: "bg-gold/30 text-[#7a5c1a] font-semibold",
  registered: "bg-black/10 text-black/60",
  finished: "bg-green-100 text-green-800",
  dnf: "bg-red-100 text-red-800",
  dns: "bg-orange-100 text-orange-800",
};

const statusLabels: Record<Status, string> = {
  setup: "Setup",
  predictions_open: "Predictions Open",
  predictions_locked: "Locked",
  results_entering: "Entering Results",
  finalized: "Finalized",
  registered: "Registered",
  finished: "Finished",
  dnf: "DNF",
  dns: "DNS",
};

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}
