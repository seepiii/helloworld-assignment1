"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase-server";
import { nextVote, type Vote } from "@/lib/observatory";

export async function castVote(reportId: string, clicked: 1 | -1) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to vote." };

  const { data: existing } = await supabase
    .from("votes")
    .select("value")
    .eq("report_id", reportId)
    .eq("user_id", user.id)
    .maybeSingle<{ value: Vote }>();

  const next = nextVote(existing?.value ?? 0, clicked);
  const { error } =
    next === 0
      ? await supabase.from("votes").delete().eq("report_id", reportId).eq("user_id", user.id)
      : await supabase
          .from("votes")
          .upsert({ report_id: reportId, user_id: user.id, value: next });
  if (error) return { error: error.message };

  const { data: row } = await supabase
    .from("report_feed")
    .select("score")
    .eq("id", reportId)
    .single<{ score: number }>();

  revalidatePath("/observatory");
  revalidatePath("/mission-control");
  return { score: row?.score ?? 0, myVote: next };
}
