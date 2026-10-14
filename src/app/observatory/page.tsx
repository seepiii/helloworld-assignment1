import Link from "next/link";
import SpaceBackground from "@/components/SpaceBackground";
import { getUserAndProfile } from "@/lib/supabase-server";
import { KINDS, isReportKind } from "@/lib/observatory";
import { getFeed, getMyVotes, getTodayAnomaly, type FeedSort } from "@/lib/observatory-server";
import HowItWorks from "./HowItWorks";
import ReportCard from "./ReportCard";

// Every way to add something to the rankings, in one place.
const CREATE = [
  { label: "✉ Postcard", hint: "The alien paints your subject on a planet it's visited", href: "/observatory/teleport", featured: true },
  { label: "◎ Field Note", hint: "The alien's take on something people do", href: "/observatory/new?kind=field_note" },
  { label: "◐ Exoplanet", hint: "The alien mistakes a NYC place for a planet", href: "/observatory/new?kind=exoplanet" },
  { label: "◉ Transmission", hint: "The alien's take on your photo", href: "/observatory/new?kind=transmission" },
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
    `rounded-full px-4 py-1.5 font-mono text-[11px] tracking-[0.15em] uppercase transition ${
      active ? "bg-[#e9c46a]/20 text-[#f4dfa6] border border-[#e9c46a]/50" : "border border-white/10 text-white/50 hover:text-white/80"
    }`;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] px-4 pt-20 pb-12 sm:px-8">
      <SpaceBackground count={70} />
      <div className="relative z-10 mx-auto flex max-w-3xl flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[10px] tracking-[0.3em] text-[#7ee2a8] uppercase">Studying Earth since 2026</p>
          <h1 className="text-3xl font-bold tracking-wide text-white sm:text-4xl" style={{ textShadow: "0 0 22px rgba(233, 196, 106, 0.3)" }}>
            The Earth Observatory
          </h1>
          <p className="text-sm text-white/60">
            Alien researchers file reports on New York and Columbia. You decide which ones are true science.
          </p>
        </div>

        <section className="hud-panel flex flex-col gap-3 p-5">
          <span className="font-mono text-[10px] tracking-[0.25em] text-white/40 uppercase">Create · everything lands in the rankings below</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CREATE.map((c) => (
              <Link
                key={c.label}
                href={user ? c.href : "/login"}
                className={`flex flex-col gap-0.5 rounded-lg border px-3 py-2.5 transition ${
                  c.featured
                    ? "border-[#e9c46a]/60 bg-[#e9c46a]/15 hover:bg-[#e9c46a]/25"
                    : "border-white/10 bg-black/20 hover:border-white/30"
                }`}
              >
                <span className={`text-sm font-bold ${c.featured ? "text-[#f4dfa6]" : "text-white"}`}>{c.label}</span>
                <span className="text-[11px] leading-snug text-white/50">{c.hint}</span>
              </Link>
            ))}
          </div>
          {!user && (
            <p className="text-xs text-white/50">
              You&apos;re browsing as a guest: anyone can read and see the rankings.{" "}
              <Link href="/login" className="text-[#f4dfa6] underline-offset-4 hover:underline">Sign in with Google</Link> to create and vote.
            </p>
          )}
        </section>

        <HowItWorks />

        {anomaly && (
          <section className="hud-panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[10px] tracking-[0.25em] text-[#7ee2a8] uppercase">Today&apos;s anomaly</span>
              <span className="text-xl font-bold text-white">{anomaly.subject}</span>
              {anomaly.blurb && <span className="text-sm text-white/50">{anomaly.blurb}</span>}
            </div>
            <Link
              href={user ? "/observatory/new?anomaly=1" : "/login"}
              className="cta-glow shrink-0 rounded-full border border-[#e9c46a]/70 bg-[#e9c46a]/15 px-6 py-2.5 text-center text-xs font-bold tracking-[0.2em] text-[#f4dfa6] uppercase hover:bg-[#e9c46a]/25"
            >
              {user ? "Investigate it →" : "Sign in to investigate"}
            </Link>
          </section>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav className="flex flex-wrap gap-2">
            {SORTS.map((s) => (
              <Link key={s.id} href={href({ sort: s.id })} className={tab(s.id === sort)}>{s.label}</Link>
            ))}
          </nav>
        </div>

        <nav className="flex flex-wrap gap-2">
          <Link href={href({ kind: null })} className={tab(!kind)}>All types</Link>
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

        {reports?.map((r) => (
          <ReportCard key={r.id} report={r} myVote={myVotes[r.id] ?? 0} signedIn={!!user} />
        ))}
      </div>
    </main>
  );
}
