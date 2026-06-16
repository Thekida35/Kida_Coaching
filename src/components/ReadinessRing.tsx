"use client";

import { useEffect, useRef, useState } from "react";

/** Anneau de readiness (0-100). Couleur teal→coral selon le niveau. */
export default function ReadinessRing({ value }: { value: number }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value)) / 100;
  const [offset, setOffset] = useState(c);
  const ref = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setOffset(c * (1 - pct));
      return;
    }
    const id = requestAnimationFrame(() => setOffset(c * (1 - pct)));
    return () => cancelAnimationFrame(id);
  }, [c, pct]);

  const color = value >= 67 ? "var(--teal)" : value >= 40 ? "var(--amber)" : "var(--coral)";

  return (
    <div className="ring">
      <svg width="104" height="104" viewBox="0 0 104 104">
        <circle cx="52" cy="52" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="9" />
        <circle
          ref={ref}
          cx="52"
          cy="52"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.5,0,.2,1)" }}
        />
      </svg>
      <div className="val">
        <b>{Math.round(value)}</b>
        <small>Readiness</small>
      </div>
    </div>
  );
}
