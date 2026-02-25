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
    <div className="min-h-screen bg-cream">
      <nav className="border-b border-black/10 bg-black">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-6">
          <Link
            href={`/admin/${secret}`}
            className="text-lg font-bold font-serif text-cream hover:text-gold transition-colors"
          >
            Chiptime Admin
          </Link>
          <Link
            href={`/admin/${secret}/create`}
            className="text-sm text-cream/70 hover:text-cream transition-colors"
          >
            Create Game
          </Link>
          <Link
            href={`/admin/${secret}/athletes`}
            className="text-sm text-cream/70 hover:text-cream transition-colors"
          >
            Athletes
          </Link>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
