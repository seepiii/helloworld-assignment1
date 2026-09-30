"use client";

import { useEffect, useState } from "react";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Live UTC clock plus time elapsed since this session's sign-in.
export default function MissionClock({ since }: { since: string | null }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    const first = setTimeout(() => setNow(new Date()), 0);
    return () => {
      clearInterval(id);
      clearTimeout(first);
    };
  }, []);

  const utc = now
    ? `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`
    : "--:--:--";

  let met = "--:--:--";
  if (now && since) {
    const s = Math.max(0, Math.floor((now.getTime() - Date.parse(since)) / 1000));
    met = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
  }

  return (
    <div className="flex gap-8 font-mono">
      <div className="flex flex-col items-end">
        <span className="text-[10px] tracking-[0.25em] text-white/35 uppercase">
          UTC
        </span>
        <span className="text-xl text-white tabular-nums">{utc}</span>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-[10px] tracking-[0.25em] text-white/35 uppercase">
          Mission elapsed
        </span>
        <span className="text-xl text-[#f4dfa6] tabular-nums">T+{met}</span>
      </div>
    </div>
  );
}
