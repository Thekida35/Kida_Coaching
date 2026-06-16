import { getDashboard, fmtDate, daysTo } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ObjectifPage() {
  const { goal, score } = await getDashboard();

  if (!goal) {
    return (
      <>
        <div className="pagetitle">Mon objectif</div>
        <div className="card">
          <div className="empty">
            <div className="big">Aucun objectif défini</div>
            <p>Ajoute ta course cible (distance, date) pour que le coach raisonne à rebours du jour J.</p>
          </div>
        </div>
      </>
    );
  }

  const d = Math.max(0, daysTo(goal.raceDate));
  const dims = score
    ? [
        { nm: "Endurance", v: score.endurance, c: "var(--lime)" },
        { nm: "Résistance", v: score.resistance, c: "var(--teal)" },
        { nm: "Vitesse", v: score.speed, c: "var(--coral)" },
        { nm: "Récupération", v: score.recovery, c: "var(--amber)" },
      ]
    : [];

  return (
    <>
      <div className="pagetitle">Mon objectif</div>

      <div className="card glow">
        <div className="goal">
          <div>
            <h3>{goal.name}</h3>
            <div className="ph">
              {fmtDate(goal.raceDate)}
              {goal.distanceM ? ` · ${goal.distanceM / 1000} km` : ""}
              {goal.elevationM ? ` · ${goal.elevationM} m D+` : ""}
            </div>
          </div>
          <span className="pill">J−{d}</span>
        </div>
        <div className="row3" style={{ marginTop: 16, marginBottom: 0 }}>
          <Tile k="Objectif" v={goal.targetTimeS ? fmtHms(goal.targetTimeS) : "à définir"} />
          <Tile k="Distance" v={goal.distanceM ? `${goal.distanceM / 1000} km` : "—"} />
          <Tile k="Jours" v={`${d}`} />
        </div>
      </div>

      {goal.notes && (
        <div className="insight" style={{ marginBottom: 14 }}>
          <b>Notes de course</b>
          {goal.notes}
        </div>
      )}

      <div className="seclabel">Prêt pour la course ?</div>
      {dims.length ? (
        <div className="card">
          {dims.map((row) => (
            <div className="dim" key={row.nm}>
              <div className="nm">{row.nm}</div>
              <div className="track"><i style={{ width: `${row.v}%`, background: row.c }} /></div>
              <div className="num">{row.v}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card"><div className="empty"><p>Le score apparaîtra après ta première synchro.</p></div></div>
      )}
    </>
  );
}

function Tile({ k, v }: { k: string; v: string }) {
  return (
    <div className="tile">
      <div className="k">{k}</div>
      <div className="v mono" style={{ fontSize: 17 }}>{v}</div>
    </div>
  );
}
function fmtHms(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}
