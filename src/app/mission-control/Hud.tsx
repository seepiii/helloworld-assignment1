export function HudPanel({
  label,
  hint,
  code,
  className = "",
  children,
}: {
  label: string;
  /** One plain-English line saying what this box is for. */
  hint?: string;
  code?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`hud-panel flex flex-col gap-4 p-5 ${className}`}>
      <header className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-mono text-sm font-bold tracking-[0.25em] text-white uppercase sm:text-base">{label}</h2>
          {code && <span className="shrink-0 font-mono text-xs tracking-[0.15em] text-[#e9c46a]/70 uppercase">{code}</span>}
        </div>
        {hint && <p className="font-mono text-xs leading-relaxed text-white/55">{hint}</p>}
      </header>
      {children}
    </section>
  );
}

export function StatusLight({ color = "#7ee2a8" }: { color?: string }) {
  return (
    <span
      className="status-light inline-block h-1.5 w-1.5 rounded-full"
      style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
    />
  );
}
