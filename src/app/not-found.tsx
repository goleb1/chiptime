import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-5xl font-bold text-indigo-600 dark:text-indigo-400">404</h1>
      <p className="text-lg text-gray-600 dark:text-gray-400">
        Page not found
      </p>
      <Link
        href="/"
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
      >
        Go home
      </Link>
    </div>
  );
}
