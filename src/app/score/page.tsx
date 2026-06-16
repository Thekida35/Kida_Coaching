import { getScoreLatest, fmtDate } from "@/lib/data";
import Radar from "@/components/Radar";

export const dynamic = "force-dynamic";

export default async function ScorePage() {
  const s = await getScoreLatest();

  if (!s) {
    return (
      <>
        <div className="pagetitle">Score</div>
        <div className="card">
          <div className="empty">
            <div className="big">Pas encore de score</div>
            <p>Importe tes activités (FIT ou Strava) puis lance le calcul quotidien — ton score apparaîtra ici.</p>
          </div>
        </div>
      </>
    );
  }

  const dims = [
    { nm: "Endurance", v: s.endurance, c: "var(--lime)" },
    { nm: "Résistance", v: s.resistance, c: "var(--teal)" },
    { nm: "Vitesse", v: s.speed, c: "var(--coral)" },
    { nm: "Récupération", v: s.recovery, c: "var(--amber)" },
    { nm: "Régularité", v: s.regularity, c: "var(--blue)" },
  ];

  return (
    <>
      <div className="pagetitle">Score</div>

      <div className="card glow">
        <div className="scorehead">
          <div>
            <div className="lab">Score global</div>
            <div className="bignum">{s.overall}<sub>/100</sub></div>
          </div>
          <div className="radarwrap">
            <Radar values={dims.map((d) => d.v)} />
          </div>
        </div>
      </div>

      <div className="seclabel">Détail · {fmtDate(s.date)}</div>
      <div className="card">
        {dims.map((d) => (
          <div className="dim" key={d.nm}>
            <div className="nm">{d.nm}</div>
            <div className="track"><i style={{ width: `${d.v}%`, background: d.c }} /></div>
            <div className="num">{d.v}</div>
          </div>
        ))}
      </div>

      <div className="insight">
        <b>Comment lire ce score</b>
        Pondération : Endurance 30 % · Résistance 15 % · Vitesse 15 % · Récupération 20 % · Régularité 20 %. Ce sont des repères calibrables, pas une note figée.
      </div>
    </>
  );
}
