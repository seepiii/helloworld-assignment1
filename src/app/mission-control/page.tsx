import Link from "next/link";
import { redirect } from "next/navigation";
import SpaceBackground from "@/components/SpaceBackground";
import { needsName, type Planet } from "@/lib/supabase";
import { getUserAndProfile } from "@/lib/supabase-server";
import { HudPanel, StatusLight } from "./Hud";
import MissionClock from "./MissionClock";
import OrbitTracker from "./OrbitTracker";
import GravityConsole from "./GravityConsole";
import MissionLog from "./MissionLog";
import LaunchControl from "./LaunchControl";

// Members-only page. The proxy already bounces signed-out visitors to /login;
// this check is the authoritative one.
export default async function MissionControlPage() {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  if (needsName(profile)) redirect("/welcome");

  const { data: planets, error: planetsError } = await supabase
    .from("planets")
    .select("*")
    .order("id", { ascending: true })
    .returns<Planet[]>();

  const first = profile?.first_name ?? "Commander";
  const fullName = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim();
  const callsign = `CREW-${user.id.slice(0, 4).toUpperCase()}`;
  const enlisted = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

  const systems = [
    { name: "Life support", status: "Nominal", ok: true },
    { name: "Crew identity", status: "Verified · Google", ok: true },
    { name: "Comms · Supabase", status: planetsError ? "Degraded" : "Online", ok: !planetsError },
    { name: "Navigation", status: `${planets?.length ?? 0} bodies tracked`, ok: !!planets?.length },
    { name: "Crew record", status: profile?.avatar_url ? "Complete" : "No photo", ok: !!profile?.avatar_url },
  ];

  const log = [
    "Handshake with Google OAuth… accepted",
    "Session cookie verified by ground station",
    `Crew record ${callsign} loaded`,
    `Telemetry received for ${planets?.length ?? 0} planets`,
    "All stations report go",
    `Welcome to Mission Control, ${first}.`,
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] px-4 pt-20 pb-12 sm:px-8">
      <SpaceBackground count={80} />
      <div className="scanline pointer-events-none fixed inset-x-0 top-0 h-24 bg-gradient-to-b from-transparent via-[#e9c46a]/[0.03] to-transparent" />

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-5">
        {/* Header bar */}
        <div className="hud-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.3em] text-[#7ee2a8] uppercase">
              <StatusLight /> Clearance granted · crew only
            </div>
            <h1
              className="text-3xl font-bold tracking-wide text-white sm:text-4xl"
              style={{ textShadow: "0 0 22px rgba(233, 196, 106, 0.3)" }}
            >
              Mission Control
            </h1>
          </div>
          <MissionClock since={user.last_sign_in_at ?? null} />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Crew ID */}
          <HudPanel label="Crew ID" code={callsign}>
            <div className="flex items-center gap-4">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="h-20 w-20 shrink-0 rounded-full border border-[#e9c46a]/40 object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-dashed border-white/20 font-mono text-[10px] text-white/30 uppercase">
                  no photo
                </div>
              )}
              <div className="flex min-w-0 flex-col gap-1">
                <p className="truncate text-lg font-bold text-white">{fullName}</p>
                <p className="truncate font-mono text-xs text-white/40">{user.email}</p>
                <p className="font-mono text-[10px] tracking-[0.2em] text-[#e9c46a]/70 uppercase">
                  Enlisted {enlisted}
                </p>
              </div>
            </div>
            <Link
              href="/profile"
              className="mt-auto font-mono text-[10px] tracking-[0.25em] text-white/35 uppercase transition hover:text-white/70"
            >
              update crew record &rarr;
            </Link>
          </HudPanel>

          {/* Systems */}
          <HudPanel label="Systems status" code="SYS-05">
            <ul className="flex flex-col gap-2.5 font-mono text-xs">
              {systems.map((s) => (
                <li key={s.name} className="flex items-center justify-between gap-3">
                  <span className="text-white/60">{s.name}</span>
                  <span className="flex items-center gap-2 text-right text-white/85">
                    {s.status}
                    <StatusLight color={s.ok ? "#7ee2a8" : "#e9c46a"} />
                  </span>
                </li>
              ))}
            </ul>
          </HudPanel>

          {/* Launch */}
          <HudPanel label="Launch pad 39A" code="GO/NO-GO">
            <LaunchControl name={first} />
          </HudPanel>

          {/* Orbit map */}
          <HudPanel label="Orbital tracking" code="LIVE" className="lg:col-span-2">
            {planets && planets.length > 0 ? (
              <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[1fr_auto]">
                <OrbitTracker planets={planets} />
                <ul className="grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-[11px] md:grid-cols-1">
                  {planets.map((p) => (
                    <li key={p.id} className="flex justify-between gap-4">
                      <span className="text-white/70">{p.name}</span>
                      <span className="text-white/35">{p.distance_from_sun}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="font-mono text-xs text-red-300/80">
                No telemetry: {planetsError?.message ?? "planets table is empty"}
              </p>
            )}
          </HudPanel>

          {/* Mission log */}
          <HudPanel label="Mission log" code="REC">
            <MissionLog lines={log} />
          </HudPanel>

          {/* Gravity */}
          {planets && planets.length > 0 && (
            <HudPanel label="Gravity console · your weight across the system" code="GRV" className="lg:col-span-3">
              <GravityConsole planets={planets} />
            </HudPanel>
          )}
        </div>
      </div>
    </main>
  );
}
