"use client";

import { useSyncExternalStore } from "react";

const KEY = "observatory:how-it-works-dismissed";
const listeners = new Set<() => void>();

function read() {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}

export default function HowItWorks() {
  const dismissed = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    read,
    () => false,
  );
  if (dismissed) return null;

  function dismiss() {
    try { localStorage.setItem(KEY, "1"); } catch {}
    listeners.forEach((l) => l());
  }

  const steps = [
    ["1 · Pick a report", "Field Note (something humans do), Exoplanet (a NYC place), or Transmission (a photo)."],
    ["2 · Transmit", "Our AI alien researcher writes it up. Every report and the exact prompt are saved."],
    ["3 · Vote", "Upvote the reports that make you laugh. The best one on today's anomaly becomes Discovery of the Day."],
  ];

  return (
    <section className="hud-panel flex flex-col gap-4 p-5">
      <header className="flex items-center justify-between font-mono text-[10px] tracking-[0.25em] text-white/40 uppercase">
        <span>How the Observatory works</span>
        <button onClick={dismiss} className="hover:text-white/80">Dismiss ✕</button>
      </header>
      <ol className="grid gap-4 sm:grid-cols-3">
        {steps.map(([title, text]) => (
          <li key={title} className="flex flex-col gap-1">
            <span className="text-sm font-bold text-[#f4dfa6]">{title}</span>
            <span className="text-sm text-white/60">{text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
