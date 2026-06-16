const COLORS = ["var(--z1)", "var(--z2)", "var(--z3)", "var(--z4)", "var(--z5)"];
const LABELS = ["Z1", "Z2", "Z3", "Z4", "Z5"];

/** Barre de répartition par zone, à partir des secondes par zone. */
export default function ZoneBar({ secs }: { secs: number[] }) {
  const five = [0, 1, 2, 3, 4].map((i) => secs[i] ?? 0);
  const total = five.reduce((a, b) => a + b, 0) || 1;
  return (
    <div>
      <div className="zonebar">
        {five.map((s, i) => (
          <i key={i} style={{ width: `${(s / total) * 100}%`, background: COLORS[i] }} />
        ))}
      </div>
      <div className="zlegend">
        {LABELS.map((l, i) => (
          <span key={l}>
            <span className="sw" style={{ background: COLORS[i] }} />
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}
