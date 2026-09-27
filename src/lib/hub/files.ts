import FitParser from "fit-file-parser";
import readXlsxFile from "read-excel-file/node";
import { AI_MODEL } from "@/lib/ai";
import { kvGet, kvSet } from "@/lib/hub/db";

/**
 * Fichiers donnés au coach (trombone du chat). Chaque fichier est transformé une fois pour toutes
 * en fiche texte (images et PDF lus par Gemini, séances .fit/.gpx/.tcx résumées, tableurs et textes recopiés),
 * puis gardé dans KV `coach_files` : le coach les relit avant chaque réponse.
 */
export type CoachFile = { id: string; name: string; kind: Kind; size: number; t: number; summary: string; text: string };
type Kind = "image" | "pdf" | "seance" | "tableur" | "texte";
type Point = { t: number; d: number; hr?: number; ele?: number }; // secondes, mètres

const KEY = "coach_files";
export const MAX_BYTES = 4 * 1024 * 1024; // limite d'une requête Vercel (4,5 Mo) avec une marge
const MAX_FILES = 40;
const MAX_TEXT = 15000; // caractères gardés par fichier
export const CONTEXT_CHARS = 60000; // caractères de fiches envoyés au coach, les plus récentes d'abord

export class FileError extends Error {}

export function kindOf(name: string, mime: string): Kind | null {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "heic", "gif"].includes(ext)) return "image";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (["fit", "gpx", "tcx"].includes(ext)) return "seance";
  if (["xlsx", "xls", "csv", "tsv"].includes(ext)) return "tableur";
  if (["txt", "md", "json"].includes(ext) || mime.startsWith("text/")) return "texte";
  return null;
}

/* ── séances ── */

const hms = (s: number) => {
  s = Math.round(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return (h ? `${h}:${String(m).padStart(2, "0")}` : `${m}`) + `:${String(x).padStart(2, "0")}`;
};
const pace = (s: number, m: number) => (m > 0 ? hms((s / m) * 1000) : "—");
const avg = (xs: (number | undefined)[]) => {
  const v = xs.filter((x): x is number => typeof x === "number" && x > 0);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : undefined;
};

/** Kilomètre par kilomètre, à partir des points enregistrés. */
export function kmSplits(pts: Point[]) {
  const out: string[] = [];
  let start = 0;
  for (let km = 1, i = 0; i < pts.length; i++) {
    if (pts[i].d < km * 1000) continue;
    const seg = pts.slice(start, i + 1), a = pts[start], b = pts[i];
    const hr = avg(seg.map((p) => p.hr));
    const dz = a.ele != null && b.ele != null ? Math.round(b.ele - a.ele) : null;
    out.push(`km ${km} : ${pace(b.t - a.t, b.d - a.d)}/km` + (hr ? ` · FC ${hr}` : "") + (dz != null ? ` · dénivelé ${dz > 0 ? "+" : ""}${dz} m` : ""));
    start = i;
    km++;
  }
  return out;
}

function seanceText(o: { title: string; date?: Date | string; dist: number; time: number; hr?: number; hrMax?: number; ascent?: number; laps?: string[]; splits: string[] }) {
  const L = [
    `Séance${o.title ? ` « ${o.title} »` : ""}${o.date ? ` du ${new Date(o.date).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" })}` : ""}`,
    `Distance ${(o.dist / 1000).toFixed(2)} km · temps ${hms(o.time)} · allure ${pace(o.time, o.dist)}/km` +
      (o.hr ? ` · FC moy ${o.hr}${o.hrMax ? ` / max ${o.hrMax}` : ""}` : "") + (o.ascent ? ` · D+ ${Math.round(o.ascent)} m` : ""),
  ];
  if (o.laps && o.laps.length > 1) L.push("", "Tours :", ...o.laps);
  if (o.splits.length) L.push("", "Kilomètres :", ...o.splits);
  return { text: L.join("\n"), summary: L[1] };
}

async function readFit(buf: Buffer) {
  type Rec = { timestamp?: Date | string; distance?: number; heart_rate?: number; altitude?: number };
  type Lap = { total_distance?: number; total_timer_time?: number; avg_heart_rate?: number; max_heart_rate?: number };
  type Ses = Lap & { sport?: string; start_time?: Date | string; total_ascent?: number };
  const d = (await new FitParser({ mode: "list", lengthUnit: "km", speedUnit: "km/h" }).parseAsync(buf as Buffer<ArrayBuffer>)) as { sessions?: Ses[]; laps?: Lap[]; records?: Rec[] };
  const recs = (d.records ?? []).filter((r) => r.timestamp && r.distance != null);
  if (!recs.length && !d.sessions?.length) throw new FileError("Fichier .fit illisible ou vide.");
  const t0 = recs.length ? +new Date(recs[0].timestamp!) : 0;
  const pts: Point[] = recs.map((r) => ({ t: (+new Date(r.timestamp!) - t0) / 1000, d: r.distance! * 1000, hr: r.heart_rate, ele: r.altitude != null ? r.altitude * 1000 : undefined }));
  const s = d.sessions?.[0] ?? {};
  return seanceText({
    title: s.sport === "running" ? "course à pied" : s.sport ?? "",
    date: s.start_time ?? recs[0]?.timestamp,
    dist: s.total_distance != null ? s.total_distance * 1000 : pts.at(-1)?.d ?? 0,
    time: s.total_timer_time ?? pts.at(-1)?.t ?? 0,
    hr: s.avg_heart_rate ?? avg(pts.map((p) => p.hr)),
    hrMax: s.max_heart_rate,
    ascent: s.total_ascent != null ? s.total_ascent * 1000 : undefined,
    laps: (d.laps ?? []).map((l, i) => `${i + 1}. ${(l.total_distance ?? 0).toFixed(2)} km en ${hms(l.total_timer_time ?? 0)} · ${pace(l.total_timer_time ?? 0, (l.total_distance ?? 0) * 1000)}/km` + (l.avg_heart_rate ? ` · FC ${l.avg_heart_rate}/${l.max_heart_rate ?? "—"}` : "")),
    splits: kmSplits(pts),
  });
}

const rad = (x: number) => (x * Math.PI) / 180;
const haversine = (a: number[], b: number[]) => {
  const h = Math.sin(rad(b[0] - a[0]) / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(rad(b[1] - a[1]) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
};

/** GPX et TCX : lecture simple des points (position ou distance, temps, altitude, FC). */
export function readTrack(xml: string) {
  const title = /<name>([^<]*)<\/name>/.exec(xml)?.[1]?.trim() ?? "";
  const tag = /<trkpt\b/.test(xml) ? /<trkpt\b([^>]*)>([\s\S]*?)<\/trkpt>/g : /<Trackpoint>([\s\S]*?)<\/Trackpoint>/g;
  const get = (s: string, re: RegExp) => { const m = re.exec(s); return m ? +m[1] : undefined; };
  const raw: { t: number; ll?: number[]; d?: number; hr?: number; ele?: number }[] = [];
  for (const m of xml.matchAll(tag)) {
    const attrs = m.length > 2 ? m[1] : "", body = m[m.length - 1];
    const time = /<time>([^<]+)<\/time>|<Time>([^<]+)<\/Time>/.exec(body);
    if (!time) continue;
    const lat = get(attrs, /lat="([-\d.]+)"/) ?? get(body, /<LatitudeDegrees>([-\d.]+)</), lon = get(attrs, /lon="([-\d.]+)"/) ?? get(body, /<LongitudeDegrees>([-\d.]+)</);
    raw.push({
      t: Date.parse(time[1] ?? time[2]) / 1000,
      ll: lat != null && lon != null ? [lat, lon] : undefined,
      d: get(body, /<DistanceMeters>([\d.]+)</),
      hr: get(body, /<(?:\w+:)?hr>(\d+)</) ?? get(body, /<HeartRateBpm>\s*<Value>(\d+)</),
      ele: get(body, /<ele>([-\d.]+)</) ?? get(body, /<AltitudeMeters>([-\d.]+)</),
    });
  }
  if (raw.length < 2) throw new FileError("Aucun point de trace trouvé dans ce fichier.");
  let dist = 0, up = 0;
  const pts: Point[] = raw.map((p, i) => {
    if (i && p.d == null && p.ll && raw[i - 1].ll) dist += haversine(raw[i - 1].ll!, p.ll);
    if (i && p.ele != null && raw[i - 1].ele != null && p.ele > raw[i - 1].ele!) up += p.ele - raw[i - 1].ele!;
    return { t: p.t - raw[0].t, d: p.d ?? dist, hr: p.hr, ele: p.ele };
  });
  return seanceText({
    title, date: new Date(raw[0].t * 1000).toISOString(), dist: pts.at(-1)!.d, time: pts.at(-1)!.t,
    hr: avg(pts.map((p) => p.hr)), hrMax: Math.max(0, ...pts.map((p) => p.hr ?? 0)) || undefined, ascent: up, splits: kmSplits(pts),
  });
}

/* ── tableurs et textes ── */

async function readSheet(name: string, buf: Buffer) {
  if (/\.(csv|tsv)$/i.test(name)) return buf.toString("utf8");
  if (/\.xls$/i.test(name)) throw new FileError("Ancien format Excel (.xls) : enregistre-le en .xlsx ou .csv.");
  const sheets = await readXlsxFile(buf);
  return sheets.map((s) => `## Feuille « ${s.sheet} »\n` + s.data.filter((r) => r.some((c) => c != null && c !== "")).map((r) => r.map((c) => (c instanceof Date ? c.toISOString().slice(0, 10) : c ?? "")).join(" ; ")).join("\n")).join("\n\n");
}

/* ── images et PDF : lus par Gemini (API native, qui accepte aussi les PDF) ── */

const READ = `Tu prépares une fiche pour le coach de course à pied de Killian, qui ne verra que ton texte, jamais le fichier.
Transcris fidèlement tout ce qui est utile (chiffres, allures, FC, dates, tableaux, consignes, texte lisible) ; décris brièvement ce qui est visuel (graphique, parcours, photo).
N'invente rien. Termine par une ligne « Résumé : … » d'une phrase.`;

export async function readWithGemini(mime: string, buf: Buffer) {
  const base = process.env.GEMINI_NATIVE_URL || "https://generativelanguage.googleapis.com/v1beta";
  const r = await fetch(`${base}/models/${AI_MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ inline_data: { mime_type: mime, data: buf.toString("base64") } }, { text: READ }] }] }),
  });
  if (!r.ok) throw new FileError(r.status === 429 ? "Trop de demandes, réessaie dans quelques minutes." : "Le coach n'a pas pu lire ce fichier.");
  const j = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = (j.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
  if (!text) throw new FileError("Le coach n'a rien pu lire dans ce fichier.");
  return text;
}

const firstLine = (t: string) => {
  const r = /Résumé\s*:\s*(.+)/i.exec(t)?.[1] ?? t.split("\n").find((l) => l.trim()) ?? "";
  const s = r.replace(/[*_#`>]/g, "").trim();
  return s.length > 160 ? s.slice(0, 157) + "…" : s;
};

/** Transforme un fichier en fiche et la range avec les autres. */
export async function addFile(name: string, mime: string, buf: Buffer): Promise<CoachFile> {
  const kind = kindOf(name, mime);
  if (!kind) throw new FileError("Type de fichier non pris en charge.");
  if (!buf.length) throw new FileError("Fichier vide.");
  if (buf.length > MAX_BYTES) throw new FileError("Fichier trop lourd (4 Mo maximum).");
  let text: string, summary: string;
  if (kind === "image" || kind === "pdf") {
    text = await readWithGemini(kind === "pdf" ? "application/pdf" : mime.startsWith("image/") ? mime : "image/jpeg", buf);
    summary = firstLine(text);
  } else if (kind === "seance") {
    ({ text, summary } = /\.fit$/i.test(name) ? await readFit(buf) : readTrack(buf.toString("utf8")));
  } else {
    text = kind === "tableur" ? await readSheet(name, buf) : buf.toString("utf8");
    if (!text.trim()) throw new FileError("Aucun contenu lisible.");
    const rows = text.split("\n").filter((l) => l.trim() && !l.startsWith("## ")).length;
    summary = kind === "tableur" ? `${firstLine(text)} · ${rows} lignes` : firstLine(text);
  }
  const file: CoachFile = { id: Math.random().toString(36).slice(2, 10), name: name.slice(0, 120), kind, size: buf.length, t: Date.now(), summary, text: text.slice(0, MAX_TEXT) };
  const list = await listFiles();
  await kvSet(KEY, [file, ...list].slice(0, MAX_FILES));
  return file;
}

export async function listFiles() {
  return (await kvGet<CoachFile[]>(KEY)) ?? [];
}

export async function deleteFile(id: string) {
  await kvSet(KEY, (await listFiles()).filter((f) => f.id !== id));
}

/** Section du contexte du coach : les fiches, les plus récentes d'abord, dans la limite de CONTEXT_CHARS. */
export function filesContext(files: CoachFile[]) {
  let left = CONTEXT_CHARS;
  const parts: string[] = [];
  for (const f of files) {
    const date = new Date(f.t).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
    const block = `--- ${f.name} (${f.kind}, donné le ${date}) ---\n${f.text}`;
    if (block.length > left) {
      parts.push(`--- ${f.name} : trop long pour être relu en entier. Résumé : ${f.summary}`);
      continue;
    }
    parts.push(block);
    left -= block.length;
  }
  return parts.join("\n\n");
}
