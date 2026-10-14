import { redirect } from "next/navigation";
import SpaceBackground from "@/components/SpaceBackground";
import { getUserAndProfile } from "@/lib/supabase-server";
import { needsName } from "@/lib/supabase";
import { DESTINATIONS } from "@/lib/destinations";
import { getTodayAnomaly } from "@/lib/observatory-server";
import Teleporter from "./Teleporter";

export const maxDuration = 60;

export default async function TeleportPage({ searchParams }: PageProps<"/observatory/teleport">) {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  if (needsName(profile)) redirect("/welcome");

  const [anomaly, { data: planets }] = await Promise.all([
    getTodayAnomaly(supabase),
    supabase.from("planets").select("name, gravity_vs_earth"),
  ]);
  // Show the planets table's gravity numbers on the buttons.
  const destinations = DESTINATIONS.map((d) => ({
    ...d,
    gravity: planets?.find((p) => p.name.toLowerCase() === d.name.toLowerCase())?.gravity_vs_earth ?? d.gravity,
  }));
  const { to } = await searchParams;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] px-4 pt-20 pb-12 sm:px-8">
      <SpaceBackground count={80} />
      <div className="relative z-10 mx-auto flex max-w-4xl flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[10px] tracking-[0.3em] text-[#7ee2a8] uppercase">Teleporter · Agent {profile?.first_name}</p>
          <h1 className="text-3xl font-bold text-white sm:text-4xl" style={{ textShadow: "0 0 22px rgba(233, 196, 106, 0.3)" }}>
            Send a postcard from the solar system
          </h1>
          <p className="text-sm text-white/60">
            The alien has visited every planet below. Pick one, then describe something or upload a photo, and the alien
            paints its rendition of your subject on that planet, plus a postcard note using the planet&apos;s real gravity.
            It&apos;s posted to the Observatory for voting, and every planet you send to earns a stamp in your passport on Mission Control.
          </p>
        </div>
        <Teleporter destinations={destinations} anomaly={anomaly} initialDestination={typeof to === "string" ? to : undefined} />
      </div>
    </main>
  );
}
