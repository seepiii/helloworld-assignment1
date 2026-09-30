import { NextResponse } from "next/server";
import { needsName } from "@/lib/supabase";
import { getUserAndProfile, createSupabaseServer } from "@/lib/supabase-server";

// Google → Supabase → here. Swap the one-time code for a session cookie,
// then send first-timers to fill in their name.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { profile } = await getUserAndProfile();
      const next = needsName(profile) ? "/welcome" : "/mission-control";
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
