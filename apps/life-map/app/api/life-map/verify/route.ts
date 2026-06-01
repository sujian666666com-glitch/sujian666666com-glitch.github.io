import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createLifeMapToken } from "@/lib/life-map-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const configuredPassword = process.env.LIFE_MAP_PASSWORD;
  if (!configuredPassword) return jsonNoStore({ ok: false, message: "服务端未配置通关密钥" }, { status: 500 });

  let body: { password?: unknown };
  try {
    body = (await request.json()) as { password?: unknown };
  } catch {
    return jsonNoStore({ ok: false, message: "密码错误" }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  const input = Buffer.from(password);
  const expected = Buffer.from(configuredPassword);
  const ok = input.length === expected.length && cryptoSafeEqual(input, expected);

  if (!ok) {
    return jsonNoStore({ ok: false, message: "密码错误" }, { status: 401 });
  }

  return jsonNoStore({ ok: true, accessToken: createLifeMapToken() });
}

function cryptoSafeEqual(input: Buffer, expected: Buffer) {
  return input.length === expected.length && crypto.timingSafeEqual(input, expected);
}

function jsonNoStore(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      "Cache-Control": "no-store, private",
      ...(init?.headers ?? {})
    }
  });
}
