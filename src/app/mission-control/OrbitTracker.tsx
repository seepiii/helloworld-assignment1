import type { Planet } from "@/lib/supabase";

// Real orbital periods in Earth years, used to set relative orbit speeds.
const PERIOD_YEARS: Record<string, number> = {
  Mercury: 0.24,
  Venus: 0.62,
  Earth: 1,
  Mars: 1.88,
  Jupiter: 11.86,
  Saturn: 29.46,
  Uranus: 84,
  Neptune: 164.8,
};

const COLORS: Record<string, string> = {
  Mercury: "#b8b2a7",
  Venus: "#e8cf9a",
  Earth: "#6fa8dc",
  Mars: "#d7735a",
  Jupiter: "#d9b38c",
  Saturn: "#e9c46a",
  Uranus: "#9fd9d9",
  Neptune: "#6d8fe0",
};

export default function OrbitTracker({ planets }: { planets: Planet[] }) {
  const size = 360;
  const c = size / 2;
  const step = (c - 22) / Math.max(planets.length, 1);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto w-full max-w-[360px]"
      role="img"
      aria-label="Live orbit map of the planets"
    >
      <defs>
        <radialGradient id="sun">
          <stop offset="0%" stopColor="#fff4d0" />
          <stop offset="60%" stopColor="#e9c46a" />
          <stop offset="100%" stopColor="#e9c46a" stopOpacity="0" />
        </radialGradient>
      </defs>

      <line x1={c} y1="0" x2={c} y2={size} stroke="rgba(255,255,255,0.05)" />
      <line x1="0" y1={c} x2={size} y2={c} stroke="rgba(255,255,255,0.05)" />
      <circle cx={c} cy={c} r="16" fill="url(#sun)" />

      {planets.map((p, i) => {
        const r = 26 + step * (i + 1);
        const period = PERIOD_YEARS[p.name] ?? i + 1;
        const duration = 5 * Math.pow(period, 0.45);
        const color = COLORS[p.name] ?? "#ffffff";
        const dot = p.name === "Jupiter" || p.name === "Saturn" ? 5 : 3.5;
        // Stagger starting positions so planets aren't lined up.
        const delay = -(((i * 137) % 360) / 360) * duration;

        return (
          <g key={p.id}>
            <circle
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray="2 4"
            />
            <g
              className="orbit"
              style={{
                animationDuration: `${duration}s`,
                animationDelay: `${delay}s`,
              }}
            >
              <circle
                cx={c + r}
                cy={c}
                r={dot}
                fill={color}
                style={{ filter: `drop-shadow(0 0 4px ${color})` }}
              >
                <title>{`${p.name} — ${p.distance_from_sun} from the sun`}</title>
              </circle>
              {p.name === "Saturn" && (
                <ellipse
                  cx={c + r}
                  cy={c}
                  rx="9"
                  ry="2.5"
                  fill="none"
                  stroke={color}
                  strokeOpacity="0.7"
                />
              )}
            </g>
          </g>
        );
      })}
    </svg>
  );
}
