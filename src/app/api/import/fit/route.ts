import { NextRequest, NextResponse } from "next/server";
import { parseFit } from "@/lib/ingest/fit";
import { ingestFit } from "@/lib/ingest/sync";

export const runtime = "nodejs";

/**
 * POST /api/import/fit
 * multipart/form-data avec un champ "file" (.fit)
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "fichier .fit manquant" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const normalized = await parseFit(buffer);
    const saved = await ingestFit(normalized);
    return NextResponse.json({
      ok: true,
      activity: { id: saved.id, name: saved.name, startedAt: saved.startedAt, load: saved.trainingLoad },
    });
  } catch (err) {
    console.error("[/api/import/fit]", err);
    return NextResponse.json({ error: "fit_import_failed" }, { status: 500 });
  }
}
