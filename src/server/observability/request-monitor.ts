import { randomUUID } from "node:crypto";
import type { ObservabilityStore } from "./observability-store";
import { getObservabilityStore } from "./sqlite-observability-store";
import type { RecordRequestInput } from "./observability-types";

interface ObserveRequestOptions {
  request: Request;
  route: string;
  actor: RecordRequestInput["actor"];
  visitorId?: string;
  store?: ObservabilityStore;
  handler(requestId: string): Promise<Response>;
}

function errorType(error: unknown) {
  return error instanceof Error ? error.name : "UnknownError";
}

export async function observeRequest({
  request,
  route,
  actor,
  visitorId,
  store = getObservabilityStore(),
  handler,
}: ObserveRequestOptions) {
  const requestId = `req_${randomUUID()}`;
  const startedAt = performance.now();
  let status = 500;
  let failure: string | undefined;
  try {
    const response = await handler(requestId);
    status = response.status;
    response.headers.set("X-Request-Id", requestId);
    return response;
  } catch (error) {
    failure = errorType(error);
    throw error;
  } finally {
    try {
      await store.recordRequest({
        requestId,
        method: request.method,
        route,
        status,
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
        errorType: failure,
        actor,
        visitorId,
      });
    } catch (error) {
      console.warn(
        "[observability] request log failed:",
        error instanceof Error ? error.message : "unknown error",
      );
    }
  }
}
