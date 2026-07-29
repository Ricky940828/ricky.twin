import { randomUUID } from "node:crypto";

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) {
      return decodeURIComponent(value.join("="));
    }
  }
  return undefined;
}

export function visitorIdForRequest(request: Request) {
  const existing = cookieValue(request, "ricky_visitor");
  return existing && /^visitor-[a-z0-9-]{8,80}$/i.test(existing)
    ? existing
    : `visitor-${randomUUID()}`;
}

export function attachVisitorCookie(
  response: Response,
  request: Request,
  visitorId: string,
) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  response.headers.append(
    "Set-Cookie",
    `ricky_visitor=${encodeURIComponent(visitorId)}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${secure}`,
  );
  return response;
}

export function userAgentGroup(request: Request) {
  const value = request.headers.get("user-agent") ?? "";
  const browser = /Edg\//.test(value)
    ? "Edge"
    : /Chrome\//.test(value)
      ? "Chrome"
      : /Safari\//.test(value)
        ? "Safari"
        : /Firefox\//.test(value)
          ? "Firefox"
          : "Other";
  const system = /iPhone|iPad/.test(value)
    ? "iOS"
    : /Android/.test(value)
      ? "Android"
      : /Mac OS X/.test(value)
        ? "macOS"
        : /Windows/.test(value)
          ? "Windows"
          : /Linux/.test(value)
            ? "Linux"
            : "Unknown";
  return `${browser} / ${system}`;
}
