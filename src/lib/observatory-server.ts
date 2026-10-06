import type { SupabaseClient } from "@supabase/supabase-js";
import {
  nyDate,
  type Anomaly,
  type FeedReport,
  type ReportKind,
  type Vote,
} from "@/lib/observatory";

export type FeedSort = "top" | "new" | "all";

/** Today's anomaly in New York; falls back to the most recent one if today has none. */
export async function getTodayAnomaly(supabase: SupabaseClient): Promise<Anomaly | null> {
  const { data } = await supabase
    .from("anomalies")
    .select("date, subject, blurb")
    .lte("date", nyDate())
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle<Anomaly>();
  return data;
}

export async function getFeed(
  supabase: SupabaseClient,
  { sort, kind, limit = 50 }: { sort: FeedSort; kind?: ReportKind; limit?: number },
) {
  let q = supabase.from("report_feed").select("*");
  if (kind) q = q.eq("kind", kind);
  if (sort === "top") {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    q = q.gte("created_at", since).order("score", { ascending: false });
  } else if (sort === "all") {
    q = q.order("score", { ascending: false });
  }
  return q.order("created_at", { ascending: false }).limit(limit).returns<FeedReport[]>();
}

export async function getReport(supabase: SupabaseClient, id: string) {
  return supabase.from("report_feed").select("*").eq("id", id).maybeSingle<FeedReport>();
}

/** The signed-in user's votes on the given reports, as { reportId: -1 | 1 }. */
export async function getMyVotes(
  supabase: SupabaseClient,
  userId: string | undefined,
  reportIds: string[],
): Promise<Record<string, Vote>> {
  if (!userId || reportIds.length === 0) return {};
  const { data } = await supabase
    .from("votes")
    .select("report_id, value")
    .eq("user_id", userId)
    .in("report_id", reportIds);
  return Object.fromEntries((data ?? []).map((v) => [v.report_id, v.value as Vote]));
}
