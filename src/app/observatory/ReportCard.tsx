import Link from "next/link";
import { kindInfo, timeAgo, type FeedReport, type Vote } from "@/lib/observatory";
import { getDestination } from "@/lib/destinations";
import VoteButtons from "./VoteButtons";

export default function ReportCard({
  report, myVote, signedIn, linkToDetail = true,
}: { report: FeedReport; myVote: Vote; signedIn: boolean; linkToDetail?: boolean }) {
  const kind = kindInfo(report.kind);
  const destination = report.kind === "postcard" ? getDestination(report.planet) : null;
  return (
    <article className="hud-panel flex flex-col gap-4 p-5">
      <header className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] tracking-[0.2em] uppercase">
        <span className="flex items-center gap-3">
          <span className="text-[#e9c46a]/80">{kind.icon} {kind.label}</span>
          {destination && (
            <span className="flex items-center gap-1.5" style={{ color: destination.color }}>
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: destination.color }} />
              → {destination.name}
            </span>
          )}
        </span>
        {report.anomaly_date && <span className="rounded-full border border-[#7ee2a8]/40 px-2 py-0.5 text-[#7ee2a8]">Daily anomaly</span>}
      </header>

      <h2 className="text-lg font-bold text-white">{report.subject}</h2>

      {report.image_url && destination ? (
        <figure className="flex flex-col gap-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={report.image_url} alt={`Alien artist's rendition: ${report.subject}`} className="w-full rounded-lg border border-white/10" />
          <figcaption className="font-mono text-[10px] tracking-[0.2em] text-white/35 uppercase">
            Alien artist rendition · {destination.name}
          </figcaption>
        </figure>
      ) : report.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={report.image_url} alt={`Photo for ${report.subject}`} className="max-h-80 w-full rounded-lg border border-white/10 object-cover" />
      ) : null}

      <p className="font-mono text-sm leading-relaxed whitespace-pre-line text-white/80">{report.body}</p>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3">
        <div className="flex items-center gap-2 text-xs text-white/40">
          {report.author_avatar && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={report.author_avatar} alt="" className="h-5 w-5 rounded-full object-cover" />
          )}
          <span>Agent {report.author_name ?? "Unknown"}</span>
          <span>·</span>
          {linkToDetail ? (
            <Link href={`/observatory/${report.id}`} className="hover:text-white/70">{timeAgo(report.created_at)}</Link>
          ) : (
            <span>{timeAgo(report.created_at)}</span>
          )}
        </div>
        <VoteButtons reportId={report.id} score={report.score} myVote={myVote} signedIn={signedIn} />
      </footer>
    </article>
  );
}
