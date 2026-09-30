"use client";

import Link from "next/link";
import { useMemo } from "react";
import SpaceBackground from "@/components/SpaceBackground";

const TEXT = "Hello World";

function seeded(seed: number) {
  const x = Math.sin(seed * 999) * 10000;
  return x - Math.floor(x);
}

function useLetters(text: string) {
  return useMemo(
    () =>
      text.split("").map((char, i) => {
        const r1 = seeded(i + 1);
        const r2 = seeded(i + 101);
        const r3 = seeded(i + 201);
        return {
          char,
          tx: `${((r1 - 0.5) * 30).toFixed(2)}px`,
          ty: `${((r2 - 0.5) * 24 - 10).toFixed(2)}px`,
          rot: `${((r3 - 0.5) * 16).toFixed(2)}deg`,
          delay: `${(r1 * 2).toFixed(2)}s`,
        };
      }),
    [text],
  );
}

export default function HelloWorld({
  signedIn,
  firstName,
}: {
  signedIn: boolean;
  firstName: string | null;
}) {
  const letters = useLetters(TEXT);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050505]">
      <SpaceBackground />

      <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
        <h1 className="flex flex-wrap justify-center text-5xl font-bold tracking-wide select-none sm:text-6xl md:text-7xl">
          {letters.map((l, i) => (
            <span
              key={i}
              className="letter-wrapper inline-block cursor-default"
              style={
                {
                  "--tx": l.tx,
                  "--ty": l.ty,
                  "--rot": l.rot,
                } as React.CSSProperties
              }
            >
              <span
                className="letter-inner inline-block text-white"
                style={{ animationDelay: l.delay }}
              >
                {l.char === " " ? " " : l.char}
              </span>
            </span>
          ))}
        </h1>
        <p
          className="text-sm tracking-[0.3em] text-white/40 uppercase"
          style={{ textShadow: "0 0 10px rgba(233, 196, 106, 0.18)" }}
        >
          Sampadaa Prakash
        </p>
        <Link
          href={signedIn ? "/mission-control" : "/login"}
          className="cta-glow mt-4 rounded-full border border-[#e9c46a]/70 bg-[#e9c46a]/15 px-8 py-3.5 text-sm font-bold tracking-[0.25em] text-[#f4dfa6] uppercase transition hover:bg-[#e9c46a]/25 hover:text-white"
        >
          {signedIn
            ? `Enter Mission Control${firstName ? `, ${firstName}` : ""} →`
            : "Sign in to enter Mission Control →"}
        </Link>
        {!signedIn && (
          <p className="-mt-2 text-xs tracking-[0.15em] text-white/40">
            crew-only area · sign in with Google
          </p>
        )}
        <Link
          href="/planets"
          className="text-xs tracking-[0.2em] text-white/30 uppercase transition hover:text-white/60"
        >
          view the planets &rarr;
        </Link>
      </div>
    </main>
  );
}
