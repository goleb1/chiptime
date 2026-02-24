import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { mapGameRow, mapRunnerRow } from "@/lib/db-utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const db = createAdminClient();

  const { data: gameRow, error: gameError } = await db
    .from("games")
    .select("*")
    .eq("slug", slug)
    .single();

  if (gameError || !gameRow) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const game = mapGameRow(gameRow);

  const [{ data: runnerRows }, { count: guesserCount }] = await Promise.all([
    db
      .from("runners")
      .select("*, athletes(*)")
      .eq("game_id", game.id)
      .order("sort_order", { ascending: true }),
    db
      .from("guessers")
      .select("id", { count: "exact", head: true })
      .eq("game_id", game.id),
  ]);

  return NextResponse.json({
    game,
    runners: (runnerRows || []).map(mapRunnerRow),
    guesserCount: guesserCount ?? 0,
  });
}
