"use client";

import { useEffect, useState } from "react";

type Phase = "idle" | "counting" | "liftoff";

export default function LaunchControl({ name }: { name: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [t, setT] = useState(10);

  useEffect(() => {
    if (phase !== "counting") return;
    const id = setTimeout(() => {
      if (t <= 1) setPhase("liftoff");
      else setT(t - 1);
    }, 1000);
    return () => clearTimeout(id);
  }, [phase, t]);

  function start() {
    setT(10);
    setPhase("counting");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      {phase === "idle" && (
        <>
          <p className="font-mono text-xs tracking-[0.2em] text-white/40 uppercase">
            All stations go
          </p>
          <button
            onClick={start}
            className="rounded-full border border-[#e9c46a]/50 bg-[#e9c46a]/10 px-8 py-3 font-mono text-sm tracking-[0.3em] text-[#f4dfa6] uppercase shadow-[0_0_24px_rgba(233,196,106,0.15)] transition hover:bg-[#e9c46a]/20 hover:shadow-[0_0_36px_rgba(233,196,106,0.3)]"
          >
            Initiate launch
          </button>
        </>
      )}

      {phase === "counting" && (
        <>
          <p className="font-mono text-xs tracking-[0.2em] text-white/40 uppercase">
            T-minus
          </p>
          <p
            key={t}
            className="font-mono text-6xl font-bold text-white tabular-nums"
            style={{ textShadow: "0 0 24px rgba(233,196,106,0.5)" }}
          >
            {t}
          </p>
          <button
            onClick={() => setPhase("idle")}
            className="font-mono text-[10px] tracking-[0.25em] text-red-300/70 uppercase hover:text-red-300"
          >
            Abort
          </button>
        </>
      )}

      {phase === "liftoff" && (
        <>
          <svg
            viewBox="0 0 24 48"
            className="h-16"
            style={{ animation: "liftoff 2.5s ease-in forwards" }}
            aria-hidden
          >
            <path d="M12 2 C17 10 17 26 16 34 H8 C7 26 7 10 12 2Z" fill="#f4f1ea" />
            <circle cx="12" cy="18" r="2.5" fill="#6fa8dc" />
            <path d="M8 28 L3 38 L8 35Z M16 28 L21 38 L16 35Z" fill="#e9c46a" />
            <path d="M9 35 Q12 48 15 35Z" fill="#ffb347" />
          </svg>
          <p className="font-mono text-sm tracking-[0.3em] text-[#f4dfa6] uppercase">
            Liftoff
          </p>
          <p className="text-sm text-white/50">Godspeed, {name}.</p>
          <button
            onClick={() => setPhase("idle")}
            className="font-mono text-[10px] tracking-[0.25em] text-white/30 uppercase hover:text-white/60"
          >
            Reset pad
          </button>
        </>
      )}
    </div>
  );
}
