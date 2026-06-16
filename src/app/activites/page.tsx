import { getActivities, fmtKm, fmtDuration, paceFromSpeed, fmtDate } from "@/lib/data";
import ZoneBar from "@/components/ZoneBar";

export const dynamic = "force-dynamic";

export default async function ActivitesPage() {
  const acts = await getActivities(20);

  if (acts.length === 0) {
    return (
      <>
        <div className="pagetitle">Activités</div>
        <div className="card">
          <div className="empty">
            <div className="big">Aucune activité</div>
            <p>Importe un .fit (POST /api/import/fit) ou lance une synchro Strava (POST /api/sync) pour remplir ton historique.</p>
          </div>
        </div>
      </>
    );
  }

  const [latest, ...rest] = acts;
  const zoneSecs = latest.hrZoneSecs?.length ? latest.hrZoneSecs : latest.paceZoneSecs;

  return (
    <>
      <div className="pagetitle">Activités</div>

      <div className="card">
        <div className="sess-title">{latest.name ?? "Sortie"}</div>
        <div className="sess-meta">{fmtDate(latest.startedAt)} · {latest.sport.toLowerCase()}</div>
        <div className="statline">
          <Stat v={fmtKm(latest.distanceM)} k="distance" />
          <Stat v={fmtDuration(latest.movingTimeS)} k="durée" />
          <Stat v={paceFromSpeed(latest.avgSpeedMs)} k="allure" />
          <Stat v={latest.avgHr ? `${latest.avgHr}` : "—"} k="fc moy" />
        </div>
        {zoneSecs?.length ? <ZoneBar secs={zoneSecs} /> : null}
        {latest.trainingLoad != null && (
          <div className="insight" style={{ marginTop: 12 }}>
            <b>Charge : {Math.round(latest.trainingLoad)}</b>
            {latest.decoupling != null
              ? `Découplage cardiaque ${latest.decoupling > 0 ? "+" : ""}${latest.decoupling}% — ${latest.decoupling <= 5 ? "bonne durabilité aérobie." : "dérive notable, à surveiller sur les sorties longues."}`
              : "Charge calculée à partir de l'effort."}
          </div>
        )}
      </div>

      <div className="seclabel">Précédentes</div>
      {rest.map((a) => (
        <div className="card" key={a.id} style={{ padding: 14 }}>
          <div className="recent">
            <div className="ic">🏃</div>
            <div>
              <div className="t">{a.name ?? "Sortie"}</div>
              <div className="m">
                <span className="mono">{fmtKm(a.distanceM)}</span> · {fmtDuration(a.movingTimeS)} · {paceFromSpeed(a.avgSpeedMs)}
              </div>
            </div>
            <div className="chev mono" style={{ fontSize: 11 }}>{fmtDate(a.startedAt)}</div>
          </div>
        </div>
      ))}
    </>
  );
}

function Stat({ v, k }: { v: string; k: string }) {
  return (
    <div className="c">
      <div className="v">{v}</div>
      <div className="k">{k}</div>
    </div>
  );
}
