// What the user actually asked for, shown beside the AI's postcard.
export default function OriginalPrompt({
  text,
  photoUrl,
  destination,
}: {
  text: string | null;
  photoUrl: string | null;
  destination?: string;
}) {
  if (!text && !photoUrl) return null;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="Photo the user teleported" className="h-12 w-12 shrink-0 rounded-md object-cover" />
      )}
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-mono text-[9px] tracking-[0.25em] text-white/40 uppercase">Original prompt</span>
        <span className="text-sm text-white/85">
          {text ? <>&ldquo;{text}&rdquo;</> : <span className="italic text-white/60">a photo</span>}
          {destination && <span className="text-white/45"> → {destination}</span>}
        </span>
      </div>
    </div>
  );
}
