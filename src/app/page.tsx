export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 dark:bg-black">
      <main className="flex max-w-lg flex-col items-center gap-12 text-center">
        {/* Logo / Hero */}
        <div className="flex flex-col items-center gap-4">
          <svg
            width="64"
            height="64"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle cx="32" cy="36" r="24" stroke="#4f46e5" strokeWidth="4" />
            <line x1="32" y1="36" x2="32" y2="22" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" />
            <line x1="32" y1="36" x2="42" y2="36" stroke="#818cf8" strokeWidth="3" strokeLinecap="round" />
            <rect x="28" y="4" width="8" height="6" rx="2" fill="#4f46e5" />
            <line x1="32" y1="10" x2="32" y2="12" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-5xl">
            ChipTime
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Predict race times. Compete with friends. Earn awards.
          </p>
        </div>

        {/* How it works */}
        <div className="grid w-full gap-6 sm:grid-cols-3">
          <div className="flex flex-col items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
              1
            </span>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Predict</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Guess each runner&apos;s finish time before the race.
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
              2
            </span>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Watch</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Cheer on the runners as results come in live.
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
              3
            </span>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Celebrate</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              See scores, earn awards, and claim bragging rights.
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500">
          Ask the game organizer for a link to join.
        </p>
      </main>
    </div>
  );
}
