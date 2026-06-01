import crypto from "node:crypto";

const TOKEN_TTL_MS = 1000 * 60 * 60 * 8;

interface TokenPayload {
  scope: "life-map";
  exp: number;
}

function getSecret() {
  const secret = process.env.LIFE_MAP_TOKEN_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("LIFE_MAP_TOKEN_SECRET is required in production.");
  }
  return "life-map-development-token-secret";
}

function sign(value: string) {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("base64url");
}

export function createLifeMapToken() {
  const payload: TokenPayload = {
    scope: "life-map",
    exp: Date.now() + TOKEN_TTL_MS
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyLifeMapToken(token: string | null | undefined) {
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [encodedPayload, signature] = parts;
  if (!encodedPayload || !signature) return false;

  const expected = sign(encodedPayload);
  const provided = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (provided.length !== expectedBuffer.length || !crypto.timingSafeEqual(provided, expectedBuffer)) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as TokenPayload;
    return payload.scope === "life-map" && Number.isFinite(payload.exp) && payload.exp > Date.now();
  } catch {
    return false;
  }
}
