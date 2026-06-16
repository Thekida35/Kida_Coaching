import { getDashboard, fmtKm, fmtDuration, paceFromSpeed, fmtDate } from "@/lib/data";
import ReadinessRing from "@/components/ReadinessRing";

export const dynamic = "force-dynamic";

export default async function AccueilPage() {
  const { me, today, goal, recent, weekKm } = await getDashboard();
  const firstName = me?.firstName ?? "Athlète";
  const dateStr = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const tsb = today?.tsb ?? null;
  const readiness = today?.readiness ?? null;

  const verdict =
    readiness == null
      ? null
      : readiness >= 67
        ? { tag: "good", label: "Prêt", text: "Bonne fraîcheur — tu peux pousser aujourd'hui." }
        : readiness >= 40
          ? { tag: "warn", label: "Modéré", text: "Forme correcte, reste à l'écoute des sensations." }
          : { tag: "warn", label: "Fatigue", text: "Fraîcheur basse — privilégie le footing ou le repos." };

  return (
    <>
      <div className="topbar">
        <div>
          <div className="hello">Bonjour</div>
          <div className="name">{firstName}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="date" style={{ textTransform: "capitalize" }}>{dateStr}</div>
          <div className="avatar">{firstName.slice(0, 1)}</div>
        </div>
      </div>

      {today ? (
        <div className="card glow">
          <div className="ready">
            <ReadinessRing value={readiness ?? 50} />
            <div className="ready-copy">
              <div className="verdict">
                {verdict?.label}
                {verdict && <span className={`tag ${verdict.tag}`}>{tsb != null ? `TSB ${tsb > 0 ? "+" : ""}${Math.round(tsb)}` : ""}</span>}
              </div>
              <p>{verdict?.text}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="empty">
            <div className="big">Pas encore de données</div>
            <p>Importe un fichier .fit ou lance une synchro Strava pour voir ta forme et ta readiness.</p>
          </div>
        </div>
      )}

      <div className="row3">
        <Tile k="Forme (CTL)" v={today?.ctl != null ? Math.round(today.ctl) : "—"} sub="charge chronique" />
        <Tile k="Fatigue (ATL)" v={today?.atl != null ? Math.round(today.atl) : "—"} sub="charge aiguë" />
        <Tile
          k="Fraîcheur"
          v={tsb != null ? `${tsb > 0 ? "+" : ""}${Math.round(tsb)}` : "—"}
          sub="TSB"
          tone={tsb == null ? "" : tsb >= 0 ? "pos" : "neg"}
        />
      </div>

      {goal && (
        <div className="card">
          <div className="goal">
            <div>
              <h3>{goal.name}</h3>
              <div className="ph">{fmtDate(goal.raceDate)} · {goal.distanceM ? `${goal.distanceM / 1000} km` : ""}</div>
            </div>
            <span className="pill">J−{Math.max(0, Math.ceil((goal.raceDate.getTime() - Date.now()) / 86400000))}</span>
          </div>
        </div>
      )}

      <div className="seclabel">Cette semaine</div>
      <div className="grid4">
        <div className="mini">
          <div className="ic">🏃</div>
          <div><div className="k">Volume 7 j</div><div className="v">{weekKm.toFixed(0)} km</div></div>
        </div>
        <div className="mini">
          <div className="ic">📊</div>
          <div><div className="k">Sorties 7 j</div><div className="v">{recent.length >= 4 ? "4+" : recent.length}</div></div>
        </div>
      </div>

      <div className="seclabel">Dernière activité</div>
      {recent[0] ? (
        <div className="card">
          <div className="recent">
            <div className="ic">🏃</div>
            <div>
              <div className="t">{recent[0].name ?? "Sortie"}</div>
              <div className="m">
                <span className="mono">{fmtKm(recent[0].distanceM)}</span> · {fmtDuration(recent[0].movingTimeS)} · {paceFromSpeed(recent[0].avgSpeedMs)}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card"><div className="empty"><p>Aucune activité importée pour l'instant.</p></div></div>
      )}
    </>
  );
}

function Tile({ k, v, sub, tone = "" }: { k: string; v: string | number; sub: string; tone?: string }) {
  return (
    <div className="tile">
      <div className="k">{k}</div>
      <div className={`v ${tone}`}>{v}</div>
      <div className="sub">{sub}</div>
    </div>
  );
}
