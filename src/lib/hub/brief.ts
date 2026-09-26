import { readStore } from "@/lib/hub/db";
import { forecast } from "@/lib/hub/weather";

type Session = { date: string; title: string; detail?: string };
type Race = { id: string; name: string; date: string; status?: string; plan?: Session[] };
const HOME = { lat: 48.26, lon: -1.4 }; // Saint-Aubin-du-Cormier

function parisToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
}
function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
}

/** Emoji météo à partir du code WMO d'Open-Meteo. */
function skyEmoji(code?: number) {
  if (code == null) return "🌤";
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤";
  if (code === 3) return "☁️";
  if (code <= 48) return "🌫";
  if (code <= 67 || (code >= 80 && code <= 82)) return "🌧";
  if (code <= 77 || code === 85 || code === 86) return "❄️";
  return "⛈";
}

/** Type de séance, même logique que les pastilles du plan dans l'app. */
function kind(s: Session, raceName: string) {
  const t = `${s.title} ${s.detail ?? ""}`;
  if (/repos|garde|pas de course/i.test(s.title)) return { icon: "😴", rest: true };
  if (s.title === raceName) return { icon: "🏁", rest: false };
  if (/spécifique|seuil|tempo|fractionn|vma|\d+\s*[×x]\s*(\d{3,}|\d+\s*′)/i.test(t) && !/lignes droites|80 m/i.test(s.title))
    return { icon: "⚡", rest: false };
  return { icon: "🏃", rest: false };
}

/** Court et lisible sur l'écran verrouillé : titre = jour + séance, corps = détail puis météo. */
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
    if (w) wx = `${skyEmoji(w.code)} ${w.displayTemperature} · 💧 ${w.precip.replace(" ", "")} · 🌬 ${w.extended.wind}`;
  } catch {}

  const k = s ? kind(s, next.name) : { icon: "😴", rest: true };
  const what = s ? s.title : "Repos";
  const title = `${k.icon} ${jx} · ${what}`;
  const detail = s?.detail ? s.detail : k.rest ? "Récup, hydrate-toi." : "";
  const lines = [detail, wx].filter(Boolean);
  if ((!k.rest || d <= 1) && s?.title !== next.name) lines.push(`🎯 ${next.name}`);
  return { title: title.slice(0, 60), body: lines.join("\n").slice(0, 200), url: "/" };
}
