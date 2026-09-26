import { readStore } from "@/lib/hub/db";
import { forecast } from "@/lib/hub/weather";

type Race = { id: string; name: string; date: string; status?: string; plan?: { date: string; title: string; detail?: string }[] };
const HOME = { lat: 48.26, lon: -1.4 }; // Saint-Aubin-du-Cormier

function parisToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
}
function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
}

/** Brief du matin : null s'il n'y a pas de course dans les 10 jours (sauf en test). */
export async function buildBrief(force = false) {
  const { races } = await readStore();
  const today = parisToday();
  const next = (races as Race[]).filter((r) => r.status !== "done" && r.date >= today).sort((a, b) => (a.date < b.date ? -1 : 1))[0];
  if (!next || (daysBetween(today, next.date) > 10 && !force)) return null;
  const d = daysBetween(today, next.date);
  const jx = d === 0 ? "Jour J" : d === 1 ? "Demain" : `J−${d}`;
  const s = next.plan?.find((p) => p.date === today);
  let wx = "";
  try {
    const f = await forecast(HOME.lat, HOME.lon);
    const w = f.dailyForecast.find((x) => x.date.startsWith(today))?.day;
    if (w) wx = ` · ${w.displayTemperature}, pluie ${w.precip}`;
  } catch {}
  return {
    title: `${jx} · ${next.name}`,
    body: s ? `${s.title}${s.detail ? " — " + s.detail : ""}${wx}`.slice(0, 180) : `Pas de séance prévue aujourd'hui${wx}`,
    url: "/",
  };
}
