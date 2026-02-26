import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * POST /api/admin/upload-photo
 *
 * Accepts a multipart/form-data body with a single "photo" file field.
 * Uploads the file to the athlete-photos Supabase Storage bucket and
 * returns the public URL.
 *
 * This route handler exists because Next.js server actions have a 1 MB
 * body-size limit (configurable but unreliable), while route handlers
 * have no such restriction — making them the right place for file uploads.
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const photo = form.get("photo") as File | null;

    if (!photo || photo.size === 0) {
      return NextResponse.json({ error: "No photo provided." }, { status: 400 });
    }

    if (photo.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Photo must be 5 MB or smaller." },
        { status: 413 }
      );
    }

    const db = createAdminClient();

    const ext = photo.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const bytes = await photo.arrayBuffer();
    const mimeType = photo.type || "image/jpeg";

    const { error: uploadError } = await db.storage
      .from("athlete-photos")
      .upload(path, bytes, { contentType: mimeType, upsert: false });

    if (uploadError) {
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data } = db.storage.from("athlete-photos").getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error." },
      { status: 500 }
    );
  }
}
