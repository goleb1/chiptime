import type { GameStatus, RunnerStatus } from "@/lib/types";

type Status = GameStatus | RunnerStatus;

const statusColors: Record<Status, string> = {
  setup: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  predictions_open: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  predictions_locked: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  results_entering: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  finalized: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  registered: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  finished: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  dnf: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  dns: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
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
