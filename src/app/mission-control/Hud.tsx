export function HudPanel({
  label,
  code,
  className = "",
  children,
}: {
  label: string;
  code?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`hud-panel flex flex-col gap-4 p-5 ${className}`}>
      <header className="flex items-center justify-between font-mono text-[10px] tracking-[0.25em] text-white/40 uppercase">
        <span>{label}</span>
        {code && <span className="text-[#e9c46a]/50">{code}</span>}
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
