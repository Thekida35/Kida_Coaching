/** Radar pentagone des 5 dimensions du score (SVG déterministe). */
export default function Radar({
  values,
  labels = ["Endur.", "Résist.", "Vitesse", "Récup.", "Régul."],
}: {
  values: number[];
  labels?: string[];
}) {
  const cx = 78;
  const cy = 80;
  const R = 58;
  const n = 5;
  const pt = (i: number, rad: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)] as const;
  };
  const ring = (f: number) =>
    Array.from({ length: n }, (_, i) => pt(i, R * f).map((v) => v.toFixed(1)).join(",")).join(" ");
  const data = values
    .slice(0, n)
    .map((v, i) => pt(i, (R * Math.max(0, Math.min(100, v))) / 100).map((x) => x.toFixed(1)).join(","))
    .join(" ");

  return (
    <svg width="156" height="172" viewBox="0 0 156 172" role="img" aria-label="Radar du score">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={ring(f)} fill="none" stroke="#262E3A" strokeWidth="1" />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const [x, y] = pt(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#1E2530" strokeWidth="1" />;
      })}
      <polygon points={data} fill="rgba(255,107,87,.22)" stroke="#FF6B57" strokeWidth="2" strokeLinejoin="round" />
      {values.slice(0, n).map((v, i) => {
        const [x, y] = pt(i, (R * Math.max(0, Math.min(100, v))) / 100);
        return <circle key={i} cx={x} cy={y} r="2.6" fill="#FF6B57" />;
      })}
      {labels.slice(0, n).map((l, i) => {
        const [x, y] = pt(i, R + 12);
        return (
          <text
            key={i}
            x={x}
            y={y}
            fill="#7E8896"
            fontSize="7.5"
            fontFamily="JetBrains Mono, monospace"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {l}
          </text>
        );
      })}
    </svg>
  );
}
