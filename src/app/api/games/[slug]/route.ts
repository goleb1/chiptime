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

  const { data: runnerRows } = await db
    .from("runners")
    .select("*")
    .eq("game_id", gameRow.id)
    .order("sort_order", { ascending: true });

  return NextResponse.json({
    game: mapGameRow(gameRow),
    runners: (runnerRows || []).map(mapRunnerRow),
  });
}
