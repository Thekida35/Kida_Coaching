"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PlanActions({ hasPlan }: { hasPlan: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function generate() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/plan/generate", { method: "POST" });
      const data = await res.json();
      if (data.ok) router.refresh();
      else setError(data.error === "Aucun objectif actif" ? "Définis d'abord un objectif." : "Échec de la génération. Réessaie.");
    } catch {
      setError("Connexion impossible. Vérifie ta clé OpenAI.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button className="btn fill" onClick={generate} disabled={loading} style={{ width: "100%" }}>
        {loading ? "Génération en cours…" : hasPlan ? "Régénérer le plan" : "Générer mon plan"}
      </button>
      {error && <p style={{ color: "var(--coral)", fontSize: 12, marginTop: 10, textAlign: "center" }}>{error}</p>}
      {loading && <p style={{ color: "var(--faint)", fontSize: 12, marginTop: 10, textAlign: "center" }}>GPT‑5.5 construit ton plan, calé sur ta forme — quelques secondes.</p>}
    </div>
  );
}
