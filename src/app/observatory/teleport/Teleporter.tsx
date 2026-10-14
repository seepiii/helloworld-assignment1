"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Destination } from "@/lib/destinations";
import type { Anomaly } from "@/lib/observatory";
import { shrink } from "@/lib/shrink-image";
import OriginalPrompt from "../OriginalPrompt";

type Result = {
  id: string;
  title: string;
  caption: string;
  imageUrl: string;
  destination: string;
  gravity: number;
  userPrompt: string | null;
  sourceImageUrl: string | null;
};

const STAGES = ["Folding space…", "Teleporting your subject…", "The alien artist is painting…", "Adding finishing tentacle-strokes…"];

export default function Teleporter({
  destinations, anomaly, initialDestination,
}: { destinations: Destination[]; anomaly: Anomaly | null; initialDestination?: string }) {
  const [dest, setDest] = useState(destinations.find((d) => d.id === initialDestination)?.id ?? "jupiter");
  const [subject, setSubject] = useState("");
  const [useAnomaly, setUseAnomaly] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const chosen = destinations.find((d) => d.id === dest)!;

  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 6000);
    return () => clearInterval(id);
  }, [busy]);

  function toggleAnomaly(on: boolean) {
    setUseAnomaly(on);
    if (on && anomaly) setSubject(anomaly.subject);
    if (!on && anomaly && subject === anomaly.subject) setSubject("");
  }

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return setError("Please choose an image file.");
    setError(null);
    setPhoto(f);
    setPreview(URL.createObjectURL(f));
  }

  async function teleport(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!subject.trim() && !photo) return setError("Tell the alien what to teleport, or add a photo.");
    setStage(0);
    setBusy(true);
    try {
      const form = new FormData();
      form.set("destination", dest);
      form.set("subject", subject);
      form.set("useAnomaly", String(useAnomaly));
      if (photo) form.set("image", await shrink(photo), "photo.jpg");
      const res = await fetch("/api/teleport", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Teleport failed — try again.");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Teleport failed — try again.");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    const where = destinations.find((d) => d.id === result.destination)!;
    return (
      <section className="hud-panel flex flex-col gap-4 p-6">
        <span className="font-mono text-[10px] tracking-[0.25em] uppercase" style={{ color: where.color }}>
          ✉ Postcard received from {where.name} · {result.gravity}× Earth gravity
        </span>
        <h2 className="text-2xl font-bold text-white">{result.title}</h2>
        <OriginalPrompt text={result.userPrompt} photoUrl={result.sourceImageUrl} destination={where.name} />
        <figure className="flex flex-col gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.imageUrl} alt={`Alien artist's rendition: ${result.title}`} className="w-full rounded-lg border border-white/10" />
          <figcaption className="font-mono text-[10px] tracking-[0.2em] text-white/35 uppercase">Alien artist rendition · Pollinations</figcaption>
        </figure>
        <p className="font-mono text-sm leading-relaxed whitespace-pre-line text-white/85">{result.caption}</p>
        <div className="flex flex-wrap gap-3">
          <Link href={`/observatory/${result.id}`} className="rounded-full bg-[#f4dfa6] px-5 py-2 text-xs font-bold tracking-[0.15em] text-[#1a1408] uppercase hover:bg-white">View & share</Link>
          <Link href="/observatory?sort=new&kind=postcard" className="rounded-full border border-white/20 px-5 py-2 text-xs tracking-[0.15em] text-white/70 uppercase hover:text-white">See all postcards</Link>
          <button onClick={() => { setResult(null); setSubject(""); setPhoto(null); setPreview(null); setUseAnomaly(false); }}
            className="rounded-full border border-white/20 px-5 py-2 text-xs tracking-[0.15em] text-white/70 uppercase hover:text-white">
            Teleport again
          </button>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={teleport} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-mono text-[10px] tracking-[0.25em] text-white/40 uppercase">1 · Destination</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {destinations.map((d) => (
            <label key={d.id} className={`hud-panel flex cursor-pointer flex-col gap-1 p-4 transition ${dest === d.id ? "border-[#e9c46a]/60 bg-[#e9c46a]/10" : "hover:bg-white/5"}`}>
              <input type="radio" name="destination" value={d.id} checked={dest === d.id} onChange={() => setDest(d.id)} className="sr-only" />
              <span className="flex items-center gap-2 text-base font-bold text-white">
                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: d.color, boxShadow: `0 0 10px ${d.color}` }} />
                {d.name}
              </span>
              <span className="font-mono text-[10px] tracking-[0.15em] text-[#e9c46a]/70 uppercase">{d.gravity}× gravity{d.fictional ? " · fictional" : ""}</span>
              <span className="text-xs text-white/55">{d.blurb}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="hud-panel flex flex-col gap-4 p-5">
        <span className="font-mono text-[10px] tracking-[0.25em] text-white/40 uppercase">2 · What should we teleport to {chosen.name}?</span>
        <span className="-mt-2 text-xs text-white/45">Type a thing or place, add a photo, or both. With a photo, the alien paints what&apos;s in it.</span>
        {anomaly && (
          <label className="flex items-center gap-3 text-sm text-white/70">
            <input type="checkbox" checked={useAnomaly} onChange={(e) => toggleAnomaly(e.target.checked)} className="h-4 w-4 accent-[#7ee2a8]" />
            Use today&apos;s anomaly: <strong className="text-white">{anomaly.subject}</strong>
          </label>
        )}
        <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={140}
          placeholder={photo ? "optional with a photo" : "e.g. my dorm room, a bodega cat, the Low Steps"}
          className="w-full rounded-lg border border-white/15 bg-black/40 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#e9c46a]/60" />
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg border border-dashed border-white/25 px-4 py-2 text-xs tracking-[0.1em] text-white/60 uppercase hover:border-white/50 hover:text-white">
            {photo ? "Change photo" : "Add photo (optional)"}
          </button>
          {preview && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" className="h-16 w-16 rounded-lg object-cover" />
              <button type="button" onClick={() => { setPhoto(null); setPreview(null); }} className="text-xs text-white/40 hover:text-white">Remove</button>
            </>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={pick} className="hidden" />
        </div>
      </div>

      {error && <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}

      <button type="submit" disabled={busy}
        className="cta-glow rounded-full bg-[#f4dfa6] px-8 py-4 text-sm font-bold tracking-[0.3em] text-[#1a1408] uppercase transition hover:bg-white disabled:opacity-60">
        {busy ? `${STAGES[stage]} (up to 45s)` : `3 · Teleport to ${chosen.name}`}
      </button>
    </form>
  );
}
