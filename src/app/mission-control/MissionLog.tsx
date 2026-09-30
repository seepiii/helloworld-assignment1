"use client";

import { useEffect, useState } from "react";

// Reveals log lines one at a time, like a terminal booting up.
export default function MissionLog({ lines }: { lines: string[] }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (shown >= lines.length) return;
    const id = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 300 : 650);
    return () => clearTimeout(id);
  }, [shown, lines.length]);

  return (
    <ol className="flex min-h-[9rem] flex-col gap-1.5 font-mono text-xs text-white/60">
      {lines.slice(0, shown).map((line, i) => (
        <li key={i}>
          <span className="text-[#e9c46a]/60">&gt;</span> {line}
        </li>
      ))}
      {shown < lines.length && (
        <li className="status-light text-[#e9c46a]">_</li>
      )}
    </ol>
  );
}
