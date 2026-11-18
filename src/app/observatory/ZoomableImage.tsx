"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// An image you can click to see full size. Click anywhere or press Esc to close.
export default function ZoomableImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block shrink-0 cursor-zoom-in"
        aria-label={`Zoom in: ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={className} />
        <span className="pointer-events-none absolute right-1.5 bottom-1.5 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] tracking-widest text-white/80 uppercase opacity-80 group-hover:opacity-100">
          ⤢ Zoom
        </span>
      </button>
      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={alt}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[100] flex cursor-zoom-out items-center justify-center bg-black/90 p-4 sm:p-10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" />
            <span className="absolute top-4 right-5 font-mono text-xs tracking-widest text-white/60 uppercase">
              Click or Esc to close ✕
            </span>
          </div>,
          document.body,
        )}
    </>
  );
}
