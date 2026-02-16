import { notFound } from "next/navigation";
import Link from "next/link";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret || secret !== adminSecret) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <nav className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-6">
          <Link
            href={`/admin/${secret}`}
            className="text-lg font-bold text-indigo-600 dark:text-indigo-400"
          >
            ChipTime Admin
          </Link>
          <Link
            href={`/admin/${secret}/create`}
            className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            Create Game
          </Link>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
