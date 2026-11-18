import Link from "next/link";
import { kindInfo, timeAgo, type FeedReport, type Vote } from "@/lib/observatory";
import { getDestination } from "@/lib/destinations";
import VoteButtons from "./VoteButtons";
import ZoomableImage from "./ZoomableImage";

// Each card has two clearly labelled parts: what a person gave the alien (small, plain),
// and what the AI alien made from it (big, highlighted) — the thing people vote on.
export default function ReportCard({
  report, myVote, signedIn, linkToDetail = true,
}: { report: FeedReport; myVote: Vote; signedIn: boolean; linkToDetail?: boolean }) {
  const kind = kindInfo(report.kind);
  const destination = report.kind === "postcard" ? getDestination(report.planet) : null;
  const author = report.author_name ?? "Unknown";

  // What the person typed / uploaded.
  const inputText = destination ? report.user_prompt : report.subject;
  const inputPhoto = destination ? report.source_image_url : report.image_url;

  return (
    <article className="@container hud-panel flex flex-col gap-4 p-5 sm:p-7">
      <header className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs tracking-[0.2em] uppercase">
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

      {/* 1 · The person's input */}
      <section className="flex items-center gap-4 rounded-lg border border-white/10 bg-black/30 p-3">
        {inputPhoto && (
          <ZoomableImage
            src={inputPhoto}
            alt={`Photo Agent ${author} sent`}
            className="h-20 w-20 rounded-md object-cover sm:h-24 sm:w-24"
          />
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-mono text-xs tracking-[0.2em] text-white/45 uppercase">
            Agent {author} sent the alien
          </span>
          <span className="text-lg font-semibold text-white">
            {inputText ? <>&ldquo;{inputText}&rdquo;</> : <span className="italic text-white/60">a photo</span>}
            {destination && <span className="font-normal text-white/50"> → teleport to {destination.name}</span>}
          </span>
        </div>
      </section>

      {/* 2 · What the AI made from it */}
      <section className="flex flex-col gap-4 rounded-xl border-2 border-[#e9c46a]/50 bg-[#e9c46a]/[0.06] p-4 sm:p-5">
        <span className="font-mono text-xs font-bold tracking-[0.2em] text-[#f4dfa6] uppercase">
          🛸 {destination ? "The alien's postcard · AI image + caption" : "The alien's report · written by AI"}
        </span>

        {destination ? (
          <>
            <h2 className="text-2xl font-bold text-white">{report.subject}</h2>
            <div className="flex flex-col gap-5 @3xl:flex-row @3xl:items-start">
              {report.image_url && (
                <figure className="flex flex-col gap-1.5 @3xl:w-1/2 @3xl:shrink-0">
                  <ZoomableImage src={report.image_url} alt={`Alien artist's rendition: ${report.subject}`} className="w-full rounded-lg border border-white/10" />
                  <figcaption className="font-mono text-xs tracking-[0.2em] text-white/35 uppercase">
                    Alien artist rendition · {destination.name}
                  </figcaption>
                </figure>
              )}
              <p className="min-w-0 flex-1 font-mono text-base leading-relaxed whitespace-pre-line text-white/90">{report.body}</p>
            </div>
          </>
        ) : (
          <p className="font-mono text-base leading-relaxed whitespace-pre-line text-white/90">{report.body}</p>
        )}
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2 text-xs text-white/40">
          {report.author_avatar && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={report.author_avatar} alt="" className="h-5 w-5 rounded-full object-cover" />
          )}
          <span>Agent {author}</span>
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
