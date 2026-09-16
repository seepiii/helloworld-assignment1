"use client";

import { useMemo } from "react";

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
          tx: `${(r1 - 0.5) * 30}px`,
          ty: `${(r2 - 0.5) * 24 - 10}px`,
          rot: `${(r3 - 0.5) * 16}deg`,
          delay: `${(r1 * 2).toFixed(2)}s`,
        };
      }),
    [text],
  );
}

function useStars(count: number) {
  return useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const top = seeded(i + 1) * 100;
        const left = seeded(i + 501) * 100;
        const size = 1 + seeded(i + 1001) * 2;
        const delay = seeded(i + 1501) * 4;
        const duration = 2 + seeded(i + 2001) * 3;
        return { top, left, size, delay, duration };
      }),
    [count],
  );
}

export default function Home() {
  const letters = useLetters(TEXT);
  const stars = useStars(140);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050505]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="pointer-events-none absolute inset-0">
        {stars.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              top: `${s.top}%`,
              left: `${s.left}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              animation: `twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
            }}
          />
        ))}
      </div>

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
      </div>
    </main>
  );
}
