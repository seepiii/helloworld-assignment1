"use client";

import { useState } from "react";
import type { Planet } from "@/lib/supabase";

// "What would I weigh there?" — uses gravity_vs_earth from the planets table.
export default function GravityConsole({ planets }: { planets: Planet[] }) {
  const [kg, setKg] = useState(60);
  const max = Math.max(...planets.map((p) => p.gravity_vs_earth), 1);

  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center gap-4 font-mono text-xs text-white/60">
        <span className="shrink-0 tracking-[0.15em] uppercase">
          Earth weight
        </span>
        <input
          type="range"
          min={20}
          max={150}
          value={kg}
          onChange={(e) => setKg(Number(e.target.value))}
          className="w-full accent-[#e9c46a]"
        />
        <span className="w-14 shrink-0 text-right text-white tabular-nums">
          {kg} kg
        </span>
      </label>

      <ul className="flex flex-col gap-2">
        {planets.map((p) => (
          <li
            key={p.id}
            className="grid grid-cols-[4.5rem_1fr_4rem] items-center gap-3 font-mono text-xs"
          >
            <span className="text-white/60">{p.name}</span>
            <span className="h-1.5 overflow-hidden rounded-full bg-white/5">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-[#e9c46a]/40 to-[#e9c46a] transition-all duration-500"
                style={{ width: `${(p.gravity_vs_earth / max) * 100}%` }}
              />
            </span>
            <span className="text-right text-white tabular-nums">
              {Math.round(kg * p.gravity_vs_earth)} kg
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
