import { getActivePlan, getGoal, fmtDate, daysTo } from "@/lib/data";
import PlanActions from "@/components/PlanActions";

export const dynamic = "force-dynamic";

const TYPE_COLOR: Record<string, string> = {
  easy: "var(--z2)",
  recovery: "var(--z2)",
  long: "var(--lime)",
  tempo: "var(--z3)",
  threshold: "var(--z4)",
  intervals: "var(--z5)",
  race: "var(--z5)",
  strength: "var(--blue)",
  rest: "var(--surface-3)",
};
const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default async function PlanPage() {
  const [plan, goal] = await Promise.all([getActivePlan(), getGoal()]);
  const g = plan?.goal ?? goal;

  return (
    <>
      <div className="pagetitle">Plan</div>

      {g && (
        <div className="card glow">
          <div className="goal">
            <div>
              <h3>{g.name}</h3>
              <div className="ph">Objectif dans {Math.max(0, daysTo(g.raceDate))} jours</div>
            </div>
            <span className="pill">J−{Math.max(0, daysTo(g.raceDate))}</span>
          </div>
        </div>
      )}

      {!plan ? (
        <div className="card">
          <div className="empty">
            <div className="big">Pas encore de plan</div>
            <p>
              Génère un plan adaptatif calé sur ta forme actuelle et raisonné à rebours du jour J.
              Volume borné (+10 % max/semaine) et affûtage automatiques.
            </p>
            <PlanActions hasPlan={false} />
          </div>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 14 }}>
            <PlanActions hasPlan={true} />
          </div>
          {plan.weeks.map((w) => {
            const start = new Date(w.startDate);
            const end = new Date(start.getTime() + 6 * 86400000);
            const current = Date.now() >= start.getTime() && Date.now() <= end.getTime() + 86400000;
            return (
              <div className="card" key={w.id} style={current ? { borderColor: "var(--teal)" } : undefined}>
                <div className="goal" style={{ marginBottom: 8 }}>
                  <div>
                    <h3 style={{ fontSize: 16 }}>
                      Semaine {w.weekIndex + 1}
                      {current ? " · en cours" : ""}
                    </h3>
                    <div className="ph">
                      {fmtDate(start)} – {fmtDate(end)} · {w.phase} · {w.focus}
                    </div>
                  </div>
                  <span className="pill" style={{ color: "var(--teal)", background: "var(--teal-dim)" }}>
                    {Math.round(w.targetKm)} km
                  </span>
                </div>
                <ul className="struct">
                  {w.workouts.map((wo) => {
                    const type = (wo.structureJson as any)?.type ?? "easy";
                    const target =
                      wo.targetDistanceM != null
                        ? `${(wo.targetDistanceM / 1000).toFixed(0)} km`
                        : wo.targetDurationS != null
                          ? `${Math.round(wo.targetDurationS / 60)} min`
                          : "";
                    return (
                      <li key={wo.id}>
                        <span className="bar" style={{ background: TYPE_COLOR[type] ?? "var(--z2)" }} />
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            {DAYS[(new Date(wo.date).getDay() + 6) % 7]} · {wo.title}
                          </div>
                          {wo.description ? (
                            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{wo.description}</div>
                          ) : null}
                        </div>
                        {target ? <span className="mono">{target}</span> : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </>
      )}
    </>
  );
}
