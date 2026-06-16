import FitParser from "fit-file-parser";
import { NormalizedActivity, ActivityStreams, mapSport } from "./normalize";

/**
 * Parse un fichier .FIT (buffer) → NormalizedActivity.
 * C'est la voie d'ingestion la plus propre : ce sont TES fichiers, aucune API,
 * aucune restriction. Garmin/montre → export FIT → ici.
 */
export function parseFit(buffer: Buffer): Promise<NormalizedActivity> {
  const parser = new FitParser({
    force: true,
    speedUnit: "m/s",
    lengthUnit: "m",
    temperatureUnit: "celsius",
    elapsedRecordField: true,
    mode: "list",
  });

  return new Promise((resolve, reject) => {
    parser.parse(buffer, (err: Error | null, data: any) => {
      if (err) return reject(err);
      try {
        resolve(mapFitData(data));
      } catch (e) {
        reject(e);
      }
    });
  });
}

function mapFitData(data: any): NormalizedActivity {
  const session = data?.sessions?.[0] ?? {};
  const records: any[] = data?.records ?? [];

  const start: Date = session.start_time
    ? new Date(session.start_time)
    : records[0]?.timestamp
      ? new Date(records[0].timestamp)
      : new Date();

  const streams: ActivityStreams = { timeS: [] };
  const t0 = start.getTime();
  for (const r of records) {
    if (!r.timestamp) continue;
    const ts = (new Date(r.timestamp).getTime() - t0) / 1000;
    streams.timeS.push(Math.max(0, Math.round(ts)));
    if (r.heart_rate != null) (streams.hr ??= []).push(r.heart_rate);
    if (r.speed != null) (streams.speedMs ??= []).push(r.speed);
    if (r.altitude != null) (streams.altitudeM ??= []).push(r.altitude);
    if (r.cadence != null) (streams.cadence ??= []).push(r.cadence);
    if (r.power != null) (streams.powerW ??= []).push(r.power);
    if (r.position_lat != null && r.position_long != null) {
      (streams.latlng ??= []).push([r.position_lat, r.position_long]);
    }
  }

  return {
    source: "FIT_IMPORT",
    externalId: session.start_time ? `fit-${new Date(session.start_time).getTime()}` : null,
    sport: mapSport(session.sub_sport || session.sport || "run"),
    name: session.sport ? `${session.sport}` : null,
    startedAt: start,
    distanceM: num(session.total_distance),
    movingTimeS: int(session.total_timer_time),
    elapsedTimeS: int(session.total_elapsed_time),
    elevationGainM: num(session.total_ascent),
    avgSpeedMs: num(session.avg_speed),
    maxSpeedMs: num(session.max_speed),
    avgHr: int(session.avg_heart_rate),
    maxHr: int(session.max_heart_rate),
    avgCadence: num(session.avg_cadence),
    avgPowerW: num(session.avg_power),
    calories: int(session.total_calories),
    relativeEffort: null, // pas de Suffer Score dans un FIT → TRIMP calculé en aval
    streams,
  };
}

const num = (v: any): number | null => (typeof v === "number" && isFinite(v) ? v : null);
const int = (v: any): number | null => (typeof v === "number" && isFinite(v) ? Math.round(v) : null);
