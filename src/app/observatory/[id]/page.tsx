import Link from "next/link";
import { notFound } from "next/navigation";
import SpaceBackground from "@/components/SpaceBackground";
import { getUserAndProfile } from "@/lib/supabase-server";
import { getMyVotes, getReport } from "@/lib/observatory-server";
import ReportCard from "../ReportCard";

export default async function ReportPage({ params }: PageProps<"/observatory/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { supabase, user } = await getUserAndProfile();
  const { data: report } = await getReport(supabase, id);
  if (!report) notFound();
  const myVotes = await getMyVotes(supabase, user?.id, [report.id]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] px-4 pt-20 pb-12 sm:px-8">
      <SpaceBackground count={60} />
      <div className="relative z-10 mx-auto flex max-w-2xl flex-col gap-5">
        <Link href="/observatory" className="font-mono text-xs tracking-[0.2em] text-white/40 uppercase hover:text-white/70">&larr; Observatory</Link>
        <ReportCard report={report} myVote={myVotes[report.id] ?? 0} signedIn={!!user} linkToDetail={false} />
        <details className="hud-panel p-5">
          <summary className="cursor-pointer font-mono text-[11px] tracking-[0.2em] text-white/60 uppercase hover:text-white">
            {report.image_prompt ? "View the prompts sent to the AI" : "View the prompt sent to the AI"}
          </summary>
          <p className="mt-4 font-mono text-[10px] tracking-[0.15em] text-[#e9c46a]/70 uppercase">
            {report.image_prompt ? "Prompt sent to Gemini" : "Model"}: {report.model}
          </p>
          <pre className="mt-2 font-mono text-xs leading-relaxed whitespace-pre-wrap text-white/60">{report.prompt}</pre>
          {report.image_prompt && (
            <>
              <p className="mt-6 font-mono text-[10px] tracking-[0.15em] text-[#e9c46a]/70 uppercase">
                Image prompt sent to the alien artist (Pollinations)
              </p>
              <pre className="mt-2 font-mono text-xs leading-relaxed whitespace-pre-wrap text-white/60">{report.image_prompt}</pre>
            </>
          )}
        </details>
      </div>
    </main>
  );
}
