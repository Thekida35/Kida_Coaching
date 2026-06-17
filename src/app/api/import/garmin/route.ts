import { NextRequest, NextResponse } from "next/server";
import { ingestGarminSummaries } from "@/lib/ingest/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/import/garmin
 * En-tête : Authorization: Bearer <ADMIN_SECRET>
 * Corps : le contenu brut de summarizedActivities.json
 * (ou multipart avec un champ "file").
 */
export async function POST(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    let jsonText: string;
    const ctype = req.headers.get("content-type") ?? "";
    if (ctype.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "fichier manquant" }, { status: 400 });
      }
      jsonText = await file.text();
    } else {
      jsonText = await req.text();
    }

    const count = await ingestGarminSummaries(jsonText);
    return NextResponse.json({ ok: true, imported: count });
  } catch (err) {
    console.error("[/api/import/garmin]", err);
    return NextResponse.json({ error: "garmin_import_failed" }, { status: 500 });
  }
}
