import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const HOURLY_LIMIT = 10;
export const RATE_LIMIT_MESSAGE = "Signal jammed — you've sent 10 reports this hour. Try again later.";

export function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/** The optional uploaded photo, or an error message if it isn't a usable image. */
export function readImage(form: FormData): { image: File | null; error?: string } {
  const file = form.get("image");
  const image = file instanceof File && file.size > 0 ? file : null;
  if (image && !image.type.startsWith("image/")) return { image: null, error: "That file isn't an image." };
  if (image && image.size > MAX_IMAGE_BYTES) return { image: null, error: "Photos must be under 4 MB." };
  return { image };
}

/** Protects the free AI quotas: every report type counts toward one hourly limit. */
export async function overHourlyLimit(supabase: SupabaseClient, userId: string) {
  const since = new Date(Date.now() - 3600 * 1000).toISOString();
  const { count } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  return (count ?? 0) >= HOURLY_LIMIT;
}

export async function uploadReportImage(
  supabase: SupabaseClient,
  userId: string,
  bytes: Buffer,
  contentType: string,
): Promise<{ url: string } | { error: string }> {
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("reports").upload(path, bytes, { contentType });
  if (error) return { error: error.message };
  return { url: supabase.storage.from("reports").getPublicUrl(path).data.publicUrl };
}
