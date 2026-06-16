import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getDashboard() {
  const me = await prisma.athleteProfile.findUnique({
    where: { id: "me" },
    include: {
      goals: { where: { status: "ACTIVE" }, orderBy: { raceDate: "asc" }, take: 1 },
      dailyMetrics: { orderBy: { date: "desc" }, take: 1 },
      scores: { orderBy: { date: "desc" }, take: 1 },
    },
  });
  const recent = await prisma.activity.findMany({
    where: { athleteId: "me" },
    orderBy: { startedAt: "desc" },
    take: 4,
  });
  const last7 = await prisma.activity.findMany({
    where: { athleteId: "me", startedAt: { gte: new Date(Date.now() - 7 * 86400000) } },
    select: { distanceM: true },
  });
  const weekKm = last7.reduce((s, a) => s + (a.distanceM ?? 0), 0) / 1000;

  return {
    me,
    goal: me?.goals[0] ?? null,
    today: me?.dailyMetrics[0] ?? null,
    score: me?.scores[0] ?? null,
    recent,
    weekKm,
  };
}

export async function getActivities(take = 20) {
  return prisma.activity.findMany({
    where: { athleteId: "me" },
    orderBy: { startedAt: "desc" },
    take,
  });
}

export async function getScoreLatest() {
  return prisma.scoreSnapshot.findFirst({ where: { athleteId: "me" }, orderBy: { date: "desc" } });
}

export async function getGoal() {
  return prisma.goal.findFirst({
    where: { athleteId: "me", status: "ACTIVE" },
    orderBy: { raceDate: "asc" },
  });
}

export async function getActivePlan() {
  return prisma.plan.findFirst({
    where: { athleteId: "me" },
    orderBy: { createdAt: "desc" },
    include: {
      goal: true,
      weeks: { include: { workouts: { orderBy: { date: "asc" } } }, orderBy: { weekIndex: "asc" } },
    },
  });
}

// ── format helpers ───────────────────────────────────────────────────────
export function fmtPace(secPerKm?: number | null): string {
  if (!secPerKm || !isFinite(secPerKm)) return "—";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}
export function paceFromSpeed(speedMs?: number | null): string {
  if (!speedMs) return "—";
  return fmtPace(1000 / speedMs);
}
export function fmtDuration(sec?: number | null): string {
  if (!sec) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m} min`;
}
export function fmtKm(m?: number | null): string {
  if (m == null) return "—";
  return `${(m / 1000).toFixed(1)} km`;
}
export function daysTo(date: Date): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}
export function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
