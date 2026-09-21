"use client";

import { useMemo } from "react";

function seeded(seed: number) {
  const x = Math.sin(seed * 999) * 10000;
  return x - Math.floor(x);
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

export default function SpaceBackground({ count = 140 }: { count?: number }) {
  const stars = useStars(count);

  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      <div className="pointer-events-none fixed inset-0">
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
    </>
  );
}
