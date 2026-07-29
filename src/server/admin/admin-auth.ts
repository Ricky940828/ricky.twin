import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";

export const ADMIN_SESSION_COOKIE = "ricky_admin_session";

export interface AdminAuthConfig {
  password: string;
  secret: string;
  secure: boolean;
  ttlSeconds: number;
}

interface AdminSessionPayload {
  iat: number;
  exp: number;
}

const LOCAL_PASSWORD = "ricky-local";
const LOCAL_SECRET = "ricky-twin-local-session-secret";
const DEFAULT_TTL_SECONDS = 8 * 60 * 60;

export function resolveAdminAuthConfig(
  env: Record<string, string | undefined> = process.env,
  nodeEnv = process.env.NODE_ENV,
): AdminAuthConfig | null {
  const password = env.RICKY_ADMIN_PASSWORD;
  const secret = env.RICKY_ADMIN_SESSION_SECRET;
  const secure = nodeEnv === "production";

  if (password && secret) {
    return {
      password,
      secret,
      secure,
      ttlSeconds: DEFAULT_TTL_SECONDS,
    };
  }

  if (!secure) {
    return {
      password: LOCAL_PASSWORD,
      secret: LOCAL_SECRET,
      secure: false,
      ttlSeconds: DEFAULT_TTL_SECONDS,
    };
  }

  return null;
}

function secureDigest(value: string) {
  return createHash("sha256").update(value).digest();
}

export function verifyAdminPassword(
  password: string,
  config: AdminAuthConfig,
) {
  return timingSafeEqual(
    secureDigest(password),
    secureDigest(config.password),
  );
}

function signPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createAdminSessionToken(
  config: AdminAuthConfig,
  issuedAtSeconds = Math.floor(Date.now() / 1000),
) {
  const payload: AdminSessionPayload = {
    iat: issuedAtSeconds,
    exp: issuedAtSeconds + config.ttlSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  return `${encoded}.${signPayload(encoded, config.secret)}`;
}

export function verifyAdminSessionToken(
  token: string,
  config: AdminAuthConfig,
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  const [encoded, signature, ...extra] = token.split(".");
  if (!encoded || !signature || extra.length > 0) {
    return false;
  }

  const expected = signPayload(encoded, config.secret);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as Partial<AdminSessionPayload>;
    return (
      Number.isInteger(payload.iat) &&
      Number.isInteger(payload.exp) &&
      (payload.iat as number) <= nowSeconds + 60 &&
      (payload.exp as number) > nowSeconds
    );
  } catch {
    return false;
  }
}

export function createAdminSessionCookie(
  token: string,
  config: AdminAuthConfig,
) {
  const attributes = [
    `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${config.ttlSeconds}`,
  ];
  if (config.secure) {
    attributes.push("Secure");
  }
  return attributes.join("; ");
}

export function createClearedAdminSessionCookie(secure: boolean) {
  const attributes = [
    `${ADMIN_SESSION_COOKIE}=`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=0",
  ];
  if (secure) {
    attributes.push("Secure");
  }
  return attributes.join("; ");
}

function readCookie(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return undefined;
  }
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .map((part) => part.split("="))
    .find(([key]) => key === name)
    ?.slice(1)
    .join("=");
}

export function verifyAdminRequest(
  request: Request,
  config = resolveAdminAuthConfig(),
) {
  if (!config) {
    return false;
  }
  const encodedToken = readCookie(
    request.headers.get("cookie"),
    ADMIN_SESSION_COOKIE,
  );
  if (!encodedToken) {
    return false;
  }
  try {
    return verifyAdminSessionToken(
      decodeURIComponent(encodedToken),
      config,
    );
  } catch {
    return false;
  }
}
