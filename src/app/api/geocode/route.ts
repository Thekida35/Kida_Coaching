import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 80);
  if (!q) return NextResponse.json({ results: [] });
  const u = new URL("https://geocoding-api.open-meteo.com/v1/search");
  u.searchParams.set("name", q);
  u.searchParams.set("count", "3");
  u.searchParams.set("language", "fr");
  const r = await fetch(u);
  if (!r.ok) return NextResponse.json({ error: "server_unavailable" }, { status: 503 });
  const j = await r.json();
  return NextResponse.json({
    results: (j.results ?? []).map((x: { name: string; admin1?: string; latitude: number; longitude: number }) => ({
      name: [x.name, x.admin1].filter(Boolean).join(", "),
      locationKey: `${x.latitude.toFixed(3)},${x.longitude.toFixed(3)}`,
    })),
  });
}
