"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
        Something went wrong
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
