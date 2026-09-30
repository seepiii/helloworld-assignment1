import SpaceBackground from "@/components/SpaceBackground";

export default function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050505] px-6 py-24">
      <SpaceBackground count={70} />
      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-8 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center backdrop-blur-sm">
        <div className="flex flex-col items-center gap-2">
          <h1
            className="text-3xl font-bold tracking-wide text-white"
            style={{ textShadow: "0 0 22px rgba(233, 196, 106, 0.3)" }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs tracking-[0.3em] text-white/40 uppercase">
              {subtitle}
            </p>
          )}
        </div>
        {children}
      </div>
    </main>
  );
}

export const inputClass =
  "w-full rounded-lg border border-white/15 bg-black/40 px-4 py-2.5 text-white placeholder-white/30 outline-none transition focus:border-[#e9c46a]/60";

export const buttonClass =
  "w-full rounded-lg border border-[#e9c46a]/40 bg-[#e9c46a]/10 px-4 py-2.5 text-sm font-bold tracking-[0.15em] text-[#f4dfa6] uppercase transition hover:bg-[#e9c46a]/20 disabled:opacity-50";
