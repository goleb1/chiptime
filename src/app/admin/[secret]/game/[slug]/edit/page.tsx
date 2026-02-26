import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase";
import { mapGameRow } from "@/lib/db-utils";
import EditGameForm from "@/components/admin/EditGameForm";

export default async function EditGamePage({
  params,
}: {
  params: Promise<{ secret: string; slug: string }>;
}) {
  const { secret, slug } = await params;
  const db = createAdminClient();

  const { data: gameRow } = await db
    .from("games")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!gameRow) notFound();

  const game = mapGameRow(gameRow);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-serif text-black">
        Edit Race Settings
      </h1>
      <EditGameForm game={game} adminSecret={secret} />
    </div>
  );
}
