"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Accueil", icon: <><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></> },
  { href: "/objectif", label: "Objectif", icon: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></> },
  { href: "/plan", label: "Plan", icon: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></> },
  { href: "/coach", label: "Coach", icon: <path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5z" /> },
  { href: "/activites", label: "Activités", icon: <path d="M3 12h4l3 8 4-16 3 8h4" /> },
  { href: "/score", label: "Score", icon: <path d="M12 2l2.5 6.5L21 9l-5 4 1.5 7L12 16l-5.5 4L8 13 3 9l6.5-.5z" /> },
] as const;

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="nav" role="navigation" aria-label="Navigation principale">
      {TABS.map((t) => {
        const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={active ? "on" : ""} aria-current={active ? "page" : undefined}>
            <svg viewBox="0 0 24 24">{t.icon}</svg>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
