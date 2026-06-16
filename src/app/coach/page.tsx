"use client";

import { useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Ma séance d'aujourd'hui ?",
  "Suis-je prêt pour l'ultra ?",
  "Comment gérer l'affûtage ?",
];

export default function CoachPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Salut Killian. Pose-moi une question sur ton entraînement — je m'appuie sur tes données réelles." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [flags, setFlags] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setFlags([]);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
        if (Array.isArray(data.safetyFlags) && data.safetyFlags.length) setFlags(data.safetyFlags);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: "Désolé, je n'ai pas pu répondre. Réessaie dans un instant." }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Connexion au coach impossible. Vérifie ta clé OpenAI et réessaie." }]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
    }
  }

  return (
    <>
      <div className="pagetitle">Coach</div>

      <div className="chat">
        <div className="coachname"><span className="d" />Coach Tempo</div>
        {messages.map((m, i) => (
          <div key={i} className={`bub ${m.role === "user" ? "me" : "ai"}`}>{m.content}</div>
        ))}
        {loading && <div className="bub ai">…</div>}
        <div ref={endRef} />
      </div>

      {flags.length > 0 && (
        <div className="insight" style={{ borderLeftColor: "var(--coral)", marginTop: 12 }}>
          <b>Vérification de sécurité</b>
          {flags.join(" · ")}
        </div>
      )}

      <div className="chips">
        {SUGGESTIONS.map((s) => (
          <button key={s} className="chip" onClick={() => send(s)} disabled={loading}>{s}</button>
        ))}
      </div>

      <div className="composer">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(input); }}
          placeholder="Écris au coach…"
          aria-label="Message au coach"
        />
        <button className="send" onClick={() => send(input)} disabled={loading} aria-label="Envoyer">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2a0e07" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
    </>
  );
}
