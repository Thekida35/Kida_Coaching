import { NextRequest, NextResponse } from "next/server";
import { addFile, deleteFile, FileError, listFiles, MAX_BYTES } from "@/lib/hub/files";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Fichiers gardés par le coach (sans leur contenu complet). */
export async function GET() {
  const files = await listFiles();
  return NextResponse.json({ files: files.map(({ text: _t, ...f }) => f) });
}

/** POST : le fichier brut dans le corps, son nom dans l'en-tête X-File-Name (encodé). */
export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: "Le coach n'est pas configuré sur le serveur." }, { status: 503 });
  const name = decodeURIComponent(req.headers.get("x-file-name") ?? "").trim();
  if (!name) return NextResponse.json({ error: "Nom de fichier manquant." }, { status: 400 });
  if (+(req.headers.get("content-length") ?? 0) > MAX_BYTES) return NextResponse.json({ error: "Fichier trop lourd (4 Mo maximum)." }, { status: 413 });
  try {
    const buf = Buffer.from(await req.arrayBuffer());
    const { text: _t, ...file } = await addFile(name, req.headers.get("content-type") ?? "", buf);
    return NextResponse.json({ file });
  } catch (e) {
    if (e instanceof FileError) return NextResponse.json({ error: e.message }, { status: 422 });
    console.error("[/api/coach/files]", e);
    return NextResponse.json({ error: "Impossible de lire ce fichier." }, { status: 422 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });
  await deleteFile(id);
  return NextResponse.json({ ok: true });
}
