import Link from "next/link";
import SpaceBackground from "@/components/SpaceBackground";
import { getUserAndProfile } from "@/lib/supabase-server";
import { KINDS, isReportKind } from "@/lib/observatory";
import { getFeed, getMyVotes, getTodayAnomaly, type FeedSort } from "@/lib/observatory-server";
import ReportCard from "./ReportCard";

// Every way to make something. Each says plainly what you give and what the AI makes.
const CREATE = [
  { label: "✉ Postcard", give: "a thing or photo + a planet", get: "a painting of it on that planet, with a caption", href: "/observatory/teleport", featured: true },
  { label: "◎ Field Note", give: "something people do", get: "a serious report on this strange human habit", href: "/observatory/new?kind=field_note" },
  { label: "◐ Exoplanet", give: "a NYC place", get: "a report on it as if it were a new planet", href: "/observatory/new?kind=exoplanet" },
  { label: "◉ Transmission", give: "a photo", get: "the alien's description of what's in it", href: "/observatory/new?kind=transmission" },
];

const STEPS = [
  ["1", "You send the alien a topic or a photo"],
  ["2", "The AI alien writes a report or paints a postcard about it"],
  ["3", "Everyone votes, and the funniest rise to the top"],
];

const SORTS: { id: FeedSort; label: string }[] = [
  { id: "all", label: "All-time" },
  { id: "top", label: "Today's top" },
  { id: "new", label: "New" },
];

export default async function ObservatoryPage({ searchParams }: PageProps<"/observatory">) {
  const params = await searchParams;
  const sort = (SORTS.find((s) => s.id === params.sort)?.id ?? "all") as FeedSort;
  const kind = isReportKind(params.kind) ? params.kind : undefined;

  const { supabase, user } = await getUserAndProfile();
  const [anomaly, { data: reports, error }] = await Promise.all([
    getTodayAnomaly(supabase),
    getFeed(supabase, { sort, kind }),
  ]);
  const myVotes = await getMyVotes(supabase, user?.id, (reports ?? []).map((r) => r.id));

  const href = (next: { sort?: string; kind?: string | null }) => {
    const q = new URLSearchParams();
    const s = next.sort ?? sort;
    const k = next.kind === null ? undefined : (next.kind ?? kind);
    if (s !== "all") q.set("sort", s);
    if (k) q.set("kind", k);
    const str = q.toString();
    return `/observatory${str ? `?${str}` : ""}`;
  };

  const tab = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm transition ${
      active ? "bg-[#e9c46a]/20 text-[#f4dfa6] border border-[#e9c46a]/50" : "border border-white/10 text-white/50 hover:text-white/80"
    }`;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] px-4 pt-20 pb-12 sm:px-8">
      <SpaceBackground count={70} />
      <div className="relative z-10 mx-auto flex max-w-4xl flex-col gap-6">
        {/* What this is, in one read */}
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold tracking-wide text-white sm:text-4xl" style={{ textShadow: "0 0 22px rgba(233, 196, 106, 0.3)" }}>
            The Earth Observatory
          </h1>
          <p className="max-w-3xl text-lg leading-relaxed text-white/80">
            An AI alien is seeing Columbia and New York for the first time. Show it something you see every day and it
            writes a dead-serious report about it, or paints it on another planet. Then everyone votes on the funniest.
          </p>
          <ol className="grid gap-2 sm:grid-cols-3">
            {STEPS.map(([n, text]) => (
              <li key={n} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e9c46a]/20 text-sm font-bold text-[#f4dfa6]">{n}</span>
                <span className="text-sm text-white/80">{text}</span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-3">
            <a href="#make" className="cta-glow rounded-full border border-[#e9c46a]/70 bg-[#e9c46a]/20 px-6 py-2.5 text-sm font-bold text-[#f4dfa6] hover:bg-[#e9c46a]/30">
              Make one ↓
            </a>
            <a href="#rankings" className="rounded-full border border-white/15 px-6 py-2.5 text-sm text-white/75 hover:text-white">
              See the funniest ↓
            </a>
            {!user && (
              <span className="text-sm text-white/50">
                Anyone can read.{" "}
                <Link href="/login" className="text-[#f4dfa6] underline-offset-4 hover:underline">Sign in with Google</Link> to make one and vote.
              </span>
            )}
          </div>
        </div>

        {/* What you can make */}
        <section id="make" className="hud-panel flex scroll-mt-24 flex-col gap-3 p-5">
          <h2 className="text-base font-semibold text-white">What do you want the alien to make?</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {CREATE.map((c) => (
              <Link
                key={c.label}
                href={user ? c.href : "/login"}
                className={`flex flex-col gap-1 rounded-lg border px-4 py-3 transition ${
                  c.featured
                    ? "border-[#e9c46a]/60 bg-[#e9c46a]/15 hover:bg-[#e9c46a]/25"
                    : "border-white/10 bg-black/20 hover:border-white/30"
                }`}
              >
                <span className={`text-base font-bold ${c.featured ? "text-[#f4dfa6]" : "text-white"}`}>{c.label} →</span>
                <span className="text-sm leading-snug text-white/65">
                  <span className="text-white/40">You give:</span> {c.give}
                  <br />
                  <span className="text-white/40">AI makes:</span> {c.get}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {anomaly && (
          <section className="flex flex-col gap-3 rounded-lg border border-[#7ee2a8]/30 bg-[#7ee2a8]/[0.05] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-white/70">
              <span className="font-semibold text-[#7ee2a8]">Today&apos;s topic: </span>
              <span className="text-base font-bold text-white">{anomaly.subject}</span>
              <span className="text-white/50"> · everyone writes about the same thing today, and the top one becomes Discovery of the Day</span>
            </p>
            <Link
              href={user ? "/observatory/new?anomaly=1" : "/login"}
              className="shrink-0 rounded-full border border-[#7ee2a8]/50 px-5 py-2 text-center text-sm font-semibold text-[#7ee2a8] hover:bg-[#7ee2a8]/10"
            >
              {user ? "Write about it →" : "Sign in to write about it"}
            </Link>
          </section>
        )}

        {/* The memes */}
        <div id="rankings" className="flex scroll-mt-24 flex-col gap-1 pt-2">
          <h2 className="text-2xl font-bold text-white">Rankings</h2>
          <p className="text-sm text-white/55">
            {sort === "new" ? "Everything people have made, newest first." : sort === "top" ? "Made in the last 24 hours, most upvoted first." : "Everything people have made, most upvoted first."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="w-12 text-sm text-white/45">Sort</span>
          <nav className="flex flex-wrap gap-2">
            {SORTS.map((s) => (
              <Link key={s.id} href={href({ sort: s.id })} className={tab(s.id === sort)}>{s.label}</Link>
            ))}
          </nav>
        </div>

        <nav className="flex flex-wrap items-center gap-2">
          <span className="w-12 text-sm text-white/45">Show</span>
          <Link href={href({ kind: null })} className={tab(!kind)}>Everything</Link>
          {KINDS.map((k) => (
            <Link key={k.id} href={href({ kind: k.id })} className={tab(kind === k.id)} title={k.blurb}>
              {k.icon} {k.label}
            </Link>
          ))}
        </nav>

        {error && <p className="text-sm text-red-300">Couldn&apos;t load reports: {error.message}</p>}

        {reports && reports.length === 0 && (
          <div className="hud-panel flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-white/70">
              {sort === "top" ? "No reports in the last 24 hours." : "No reports yet."} Be the first to transmit.
            </p>
            <Link href={user ? "/observatory/new" : "/login"} className="font-mono text-xs tracking-[0.2em] text-[#f4dfa6] uppercase hover:text-white">
              {user ? "Write a report →" : "Sign in to write one →"}
            </Link>
          </div>
        )}

        {/* One report per row so the ranking reads top to bottom; each card spreads out to fill the width. */}
        <div className="flex flex-col gap-6">
          {reports?.map((r, i) => (
            <ReportCard key={r.id} report={r} myVote={myVotes[r.id] ?? 0} signedIn={!!user} rank={sort === "new" ? undefined : i + 1} />
          ))}
        </div>
      </div>
    </main>
  );
}
