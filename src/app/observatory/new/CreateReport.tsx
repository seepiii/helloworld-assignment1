"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { KINDS, kindInfo, type Anomaly, type ReportKind } from "@/lib/observatory";

type Result = { id: string; body: string; model: string; imageUrl: string | null; subject: string };

// Shrink photos in the browser: faster uploads and under Vercel's 4.5 MB request limit.
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't read image"))), "image/jpeg", 0.85),
  );
}

export default function CreateReport({ anomaly, startWithAnomaly }: { anomaly: Anomaly | null; startWithAnomaly: boolean }) {
  const [kind, setKind] = useState<ReportKind>("field_note");
  const [useAnomaly, setUseAnomaly] = useState(startWithAnomaly && !!anomaly);
  const [subject, setSubject] = useState(startWithAnomaly && anomaly ? anomaly.subject : "");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const info = kindInfo(kind);

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

  async function transmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (info.photo === "required" && !photo) return setError("Transmissions need a photo.");
    if (!subject.trim() && !photo) return setError("Tell the Observatory what to study, or add a photo.");

    setBusy(true);
    try {
      const form = new FormData();
      form.set("kind", kind);
      form.set("subject", subject);
      form.set("useAnomaly", String(useAnomaly));
      if (photo) form.set("image", await shrink(photo), "photo.jpg");
      const res = await fetch("/api/generate", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Transmission lost — try again.");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transmission lost — try again.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setResult(null);
    setSubject("");
    setPhoto(null);
    setPreview(null);
    setUseAnomaly(false);
  }

  if (result) {
    return (
      <section className="hud-panel flex flex-col gap-4 p-6">
        <span className="font-mono text-[10px] tracking-[0.25em] text-[#7ee2a8] uppercase">Report received · {info.label}</span>
        <h2 className="text-xl font-bold text-white">{result.subject}</h2>
        {result.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={result.imageUrl} alt="" className="max-h-80 w-full rounded-lg object-cover" />
        )}
        <p className="font-mono text-sm leading-relaxed whitespace-pre-line text-white/85">{result.body}</p>
        <p className="font-mono text-[10px] text-white/30">Written by {result.model} · saved with its prompt</p>
        <div className="flex flex-wrap gap-3">
          <Link href={`/observatory/${result.id}`} className="rounded-full bg-[#f4dfa6] px-5 py-2 text-xs font-bold tracking-[0.15em] text-[#1a1408] uppercase hover:bg-white">View & share</Link>
          <Link href="/observatory?sort=new" className="rounded-full border border-white/20 px-5 py-2 text-xs tracking-[0.15em] text-white/70 uppercase hover:text-white">See it in the feed</Link>
          <button onClick={reset} className="rounded-full border border-white/20 px-5 py-2 text-xs tracking-[0.15em] text-white/70 uppercase hover:text-white">File another</button>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={transmit} className="flex flex-col gap-5">
      <fieldset className="grid gap-3 sm:grid-cols-3">
        <legend className="mb-2 font-mono text-[10px] tracking-[0.25em] text-white/40 uppercase">1 · Report type</legend>
        {KINDS.map((k) => (
          <label key={k.id} className={`hud-panel flex cursor-pointer flex-col gap-1.5 p-4 transition ${kind === k.id ? "border-[#e9c46a]/60 bg-[#e9c46a]/10" : "hover:bg-white/5"}`}>
            <input type="radio" name="kind" value={k.id} checked={kind === k.id} onChange={() => setKind(k.id)} className="sr-only" />
            <span className="text-base font-bold text-white">{k.icon} {k.label}</span>
            <span className="text-xs text-white/60">{k.blurb}</span>
            <span className="text-xs text-white/35 italic">e.g. {k.example}</span>
            <span className="mt-1 font-mono text-[10px] tracking-[0.15em] text-[#e9c46a]/70 uppercase">Photo {k.photo}</span>
          </label>
        ))}
      </fieldset>

      <div className="hud-panel flex flex-col gap-4 p-5">
        <span className="font-mono text-[10px] tracking-[0.25em] text-white/40 uppercase">2 · What should the alien study?</span>
        <span className="-mt-2 text-xs text-white/45">Type a subject, add a photo, or both. With a photo, the alien studies what&apos;s in it.</span>
        {anomaly && (
          <label className="flex items-center gap-3 text-sm text-white/70">
            <input type="checkbox" checked={useAnomaly} onChange={(e) => toggleAnomaly(e.target.checked)} className="h-4 w-4 accent-[#7ee2a8]" />
            Use today&apos;s anomaly: <strong className="text-white">{anomaly.subject}</strong>
          </label>
        )}
        <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={140}
          placeholder={photo ? "optional with a photo — the alien will work out what it is" : info.placeholder}
          className="w-full rounded-lg border border-white/15 bg-black/40 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#e9c46a]/60" />
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg border border-dashed border-white/25 px-4 py-2 text-xs tracking-[0.1em] text-white/60 uppercase hover:border-white/50 hover:text-white">
            {photo ? "Change photo" : `Add photo (${info.photo})`}
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
        {busy ? "Transmitting… (up to 30s)" : "3 · Transmit"}
      </button>
    </form>
  );
}
