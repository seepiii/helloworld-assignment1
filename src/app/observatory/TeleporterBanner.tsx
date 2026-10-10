import Link from "next/link";
import { DESTINATIONS } from "@/lib/destinations";

// Front-and-centre entry point to the Teleporter on the Observatory feed.
export default function TeleporterBanner({ signedIn }: { signedIn: boolean }) {
  const go = (id?: string) =>
    signedIn ? `/observatory/teleport${id ? `?to=${id}` : ""}` : "/login";

  return (
    <section className="hud-panel relative flex flex-col gap-5 overflow-hidden border-[#e9c46a]/40 bg-[#e9c46a]/[0.06] p-6">
      <div
        className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, #e9c46a, transparent 70%)" }}
      />
      <div className="relative flex flex-col gap-2">
        <span className="font-mono text-[10px] tracking-[0.3em] text-[#f4dfa6] uppercase">✉ New · The Teleporter</span>
        <h2 className="text-2xl font-bold text-white sm:text-3xl">Send a postcard from another planet</h2>
        <p className="max-w-xl text-sm text-white/65">
          Pick a world, tell us what to teleport (or upload a photo), and the alien artist paints it there,
          with a postcard note using that planet&apos;s real gravity. Collect a passport stamp for every planet.
        </p>
      </div>

      <ul className="relative flex flex-wrap gap-2">
        {DESTINATIONS.map((d) => (
          <li key={d.id}>
            <Link
              href={go(d.id)}
              title={d.blurb}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 font-mono text-[10px] tracking-[0.15em] text-white/70 uppercase transition hover:border-white/40 hover:text-white"
            >
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color, boxShadow: `0 0 8px ${d.color}` }} />
              {d.name}
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href={go()}
        className="cta-glow relative self-start rounded-full bg-[#f4dfa6] px-7 py-3 text-xs font-bold tracking-[0.25em] text-[#1a1408] uppercase transition hover:bg-white"
      >
        {signedIn ? "Open the Teleporter →" : "Sign in to teleport →"}
      </Link>
    </section>
  );
}
