import { NextResponse } from "next/server";
import { vapidKey } from "@/lib/hub/push";

export async function GET() {
  return NextResponse.json({ key: vapidKey("VAPID_PUBLIC_KEY") || null });
}
