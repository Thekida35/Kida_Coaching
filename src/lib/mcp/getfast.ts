import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { NormalizedActivity, mapSport } from "../ingest/normalize";

/**
 * Client MCP GetFast.
 *
 * Rappel conformité : c'est LA voie autorisée pour l'IA + données Strava
 * (le brut API en contexte LLM est interdit, le MCP est l'exception).
 *
 * Auth : GetFast utilise OAuth. Pour démarrer, on passe le token en en-tête ;
 * à terme, branche le flow OAuth complet et rafraîchis le token.
 */
export async function getfastClient(): Promise<Client> {
  const url = new URL(process.env.GETFAST_MCP_URL ?? "https://getfast.ai/mcp");
  const transport = new StreamableHTTPClientTransport(url, {
    requestInit: {
      headers: process.env.GETFAST_TOKEN
        ? { Authorization: `Bearer ${process.env.GETFAST_TOKEN}` }
        : {},
    },
  });
  const client = new Client({ name: "tempo", version: "0.1.0" }, { capabilities: {} });
  await client.connect(transport);
  return client;
}

/** Extrait le texte des blocs de contenu d'un résultat d'outil MCP, puis JSON.parse. */
export function parseToolJson<T = any>(result: any): T {
  const text = (result?.content ?? [])
    .filter((b: any) => b?.type === "text")
    .map((b: any) => b.text)
    .join("\n");
  return JSON.parse(text);
}

/** Liste les activités récentes via GetFast (qui lit Strava côté serveur). */
export async function fetchRecentActivities(limit = 30): Promise<NormalizedActivity[]> {
  const client = await getfastClient();
  try {
    const res = await client.callTool({
      name: "context_list_activities",
      arguments: { limit },
    });
    const data = parseToolJson(res);
    const list: any[] = data?.activities ?? data ?? [];
    return list.map(mapStravaActivity);
  } finally {
    await client.close();
  }
}

/** Mappe une activité résumée (format Strava via MCP) → pivot. */
export function mapStravaActivity(a: any): NormalizedActivity {
  const s = a.summary ?? a;
  return {
    source: "STRAVA",
    externalId: String(a.id ?? a.activity_id ?? ""),
    sport: mapSport(a.sport_type ?? a.type ?? "run"),
    name: a.name ?? null,
    startedAt: new Date(a.start_local ?? a.start_date ?? a.start_date_local ?? Date.now()),
    distanceM: s.distance ?? null,
    movingTimeS: s.moving_time ?? null,
    elapsedTimeS: s.elapsed_time ?? null,
    elevationGainM: s.elevation_gain ?? s.total_elevation_gain ?? null,
    avgSpeedMs: s.avg_speed ?? s.average_speed ?? null,
    maxSpeedMs: s.max_speed ?? null,
    avgHr: s.avg_heartrate ?? s.average_heartrate ?? null,
    maxHr: s.max_heartrate ?? null,
    avgCadence: s.avg_cadence ?? null,
    calories: s.total_calories ?? s.calories ?? null,
    relativeEffort: s.relative_effort ?? s.suffer_score ?? null,
    raw: a,
  };
}
