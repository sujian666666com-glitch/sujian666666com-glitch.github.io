import { NextResponse } from "next/server";
import { lifeMapData } from "@/data/life-map-data.server";
import { verifyLifeMapToken } from "@/lib/life-map-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";

  if (!verifyLifeMapToken(token)) {
    return jsonNoStore({ ok: false, message: "未解锁人生地图" }, { status: 401 });
  }

  return jsonNoStore({ ok: true, data: lifeMapData });
}

function jsonNoStore(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      "Cache-Control": "no-store, private",
      Vary: "Authorization",
      ...(init?.headers ?? {})
    }
  });
}
