import { redirect } from "next/navigation";
import SpaceBackground from "@/components/SpaceBackground";
import { getUserAndProfile } from "@/lib/supabase-server";
import { needsName } from "@/lib/supabase";
import { getTodayAnomaly } from "@/lib/observatory-server";
import CreateReport from "./CreateReport";
import { isReportKind } from "@/lib/observatory";

export const maxDuration = 60;

export default async function NewReportPage({ searchParams }: PageProps<"/observatory/new">) {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  if (needsName(profile)) redirect("/welcome");
  const anomaly = await getTodayAnomaly(supabase);
  const { anomaly: fromAnomaly, kind } = await searchParams;
  const initialKind = isReportKind(kind) && kind !== "postcard" ? kind : "field_note";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] px-4 pt-20 pb-12 sm:px-8">
      <SpaceBackground count={60} />
      <div className="relative z-10 mx-auto flex max-w-3xl flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[10px] tracking-[0.3em] text-[#7ee2a8] uppercase">New report · Agent {profile?.first_name}</p>
          <h1 className="text-3xl font-bold text-white">File a report</h1>
          <p className="text-sm text-white/60">
            Pick a report type, tell the alien what to look at, and hit Transmit. The alien (Gemini) writes its
            interpretation, which is saved with the exact prompt and posted to the Observatory for voting.
          </p>
        </div>
        <CreateReport anomaly={anomaly} startWithAnomaly={fromAnomaly === "1"} initialKind={initialKind} />
      </div>
    </main>
  );
}
