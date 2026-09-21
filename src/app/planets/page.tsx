import Link from "next/link";
import { supabase, type Planet } from "@/lib/supabase";
import SpaceBackground from "@/components/SpaceBackground";

export const revalidate = 0;

export default async function PlanetsPage() {
  const { data: planets, error } = await supabase
    .from("planets")
    .select("*")
    .order("id", { ascending: true })
    .returns<Planet[]>();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] px-6 py-16">
      <SpaceBackground count={90} />

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1
            className="text-3xl font-bold tracking-wide text-white sm:text-4xl"
            style={{ textShadow: "0 0 22px rgba(233, 196, 106, 0.3)" }}
          >
            The Planets
          </h1>
          <p className="text-sm tracking-[0.3em] text-white/40 uppercase">
            live from supabase
          </p>
        </div>

        {error && (
          <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            Couldn&apos;t load planets: {error.message}
          </p>
        )}

        {!error && planets && planets.length === 0 && (
          <p className="text-white/50">No planets yet.</p>
        )}

        {!error && planets && planets.length > 0 && (
          <ul className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
            {planets.map((planet) => (
              <li
                key={planet.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm transition hover:border-[#e9c46a]/30 hover:bg-white/[0.05]"
              >
                <h2 className="text-lg font-semibold text-white">
                  {planet.name}
                </h2>
                <p className="mt-1 text-sm text-white/60">
                  {planet.description}
                </p>
                <p className="mt-3 text-xs tracking-[0.15em] text-[#e9c46a]/70 uppercase">
                  {planet.distance_from_sun} from the sun
                </p>
              </li>
            ))}
          </ul>
        )}

        <Link
          href="/"
          className="text-xs tracking-[0.2em] text-white/30 uppercase transition hover:text-white/60"
        >
          &larr; back home
        </Link>
      </div>
    </main>
  );
}
