/** Météo Open-Meteo (gratuite, sans clé), mise au format attendu par l'interface. */
const WMO: Record<number, string> = {
  0: "Ciel dégagé", 1: "Plutôt dégagé", 2: "Partiellement nuageux", 3: "Couvert", 45: "Brouillard", 48: "Brouillard givrant",
  51: "Bruine légère", 53: "Bruine", 55: "Bruine forte", 61: "Pluie faible", 63: "Pluie", 65: "Pluie forte",
  71: "Neige faible", 73: "Neige", 75: "Neige forte", 80: "Averses faibles", 81: "Averses", 82: "Averses fortes",
  95: "Orage", 96: "Orage et grêle", 99: "Orage et grêle",
};
const DIRS = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
const dir = (d: number) => DIRS[Math.round((((d % 360) + 360) % 360) / 45) % 8];

export async function forecast(lat: number, lon: number) {
  const u = new URL("https://api.open-meteo.com/v1/forecast");
  u.searchParams.set("latitude", String(lat));
  u.searchParams.set("longitude", String(lon));
  u.searchParams.set("daily", "weather_code,temperature_2m_max,apparent_temperature_max,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant");
  u.searchParams.set("timezone", "Europe/Paris");
  u.searchParams.set("forecast_days", "16");
  const r = await fetch(u, { next: { revalidate: 1800 } });
  if (!r.ok) throw new Error(`open-meteo ${r.status}`);
  const j = await r.json();
  const d = j.daily;
  return {
    source: "Open-Meteo",
    dailyForecast: (d.time as string[]).map((t, i) => ({
      date: `${t}T07:00:00`,
      day: {
        temperature: d.temperature_2m_max[i],
        displayTemperature: `${Math.round(d.temperature_2m_max[i])}°`,
        realFeel: `${Math.round(d.apparent_temperature_max[i])}°`,
        iconPhrase: WMO[d.weather_code[i]] ?? "—",
        precip: d.precipitation_probability_max[i] == null ? "—" : `${d.precipitation_probability_max[i]} %`,
        extended: {
          wind: `${dir(d.wind_direction_10m_dominant[i])} ${Math.round(d.wind_speed_10m_max[i])} km/h`,
          gusts: `${Math.round(d.wind_gusts_10m_max[i])} km/h`,
        },
      },
    })),
  };
}

export function parseKey(key: string | null) {
  const m = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(key ?? "");
  return m ? { lat: +m[1], lon: +m[2] } : null;
}
