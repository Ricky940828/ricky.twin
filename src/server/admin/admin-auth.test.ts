import { describe, expect, it } from "vitest";

import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionCookie,
  createAdminSessionToken,
  resolveAdminAuthConfig,
  verifyAdminPassword,
  verifyAdminSessionToken,
} from "./admin-auth";

const config = {
  password: "correct-password",
  secret: "a-test-secret-long-enough-for-signing",
  secure: false,
  ttlSeconds: 60,
};

describe("admin authentication", () => {
  it("compares correct and incorrect passwords without exposing details", () => {
    expect(verifyAdminPassword("correct-password", config)).toBe(true);
    expect(verifyAdminPassword("wrong-password", config)).toBe(false);
  });

  it("signs a session and rejects a tampered signature", () => {
    const token = createAdminSessionToken(config, 1_000);

    expect(verifyAdminSessionToken(token, config, 1_030)).toBe(true);
    expect(
      verifyAdminSessionToken(`${token.slice(0, -1)}x`, config, 1_030),
    ).toBe(false);
  });

  it("rejects an expired session", () => {
    const token = createAdminSessionToken(config, 1_000);

    expect(verifyAdminSessionToken(token, config, 1_061)).toBe(false);
  });

  it("creates a protected admin cookie and only adds Secure in production", () => {
    const token = createAdminSessionToken(config, 1_000);
    const developmentCookie = createAdminSessionCookie(token, config);
    const productionCookie = createAdminSessionCookie(token, {
      ...config,
      secure: true,
    });

    expect(developmentCookie).toContain(`${ADMIN_SESSION_COOKIE}=`);
    expect(developmentCookie).toContain("HttpOnly");
    expect(developmentCookie).toContain("SameSite=Lax");
    expect(developmentCookie).toContain("Path=/");
    expect(developmentCookie).toContain("Max-Age=60");
    expect(developmentCookie).not.toContain("Secure");
    expect(productionCookie).toContain("Secure");
  });

  it("provides a documented local fallback but refuses missing production secrets", () => {
    expect(resolveAdminAuthConfig({}, "development")).toMatchObject({
      password: "ricky-local",
      secure: false,
    });
    expect(resolveAdminAuthConfig({}, "production")).toBeNull();
  });
});
