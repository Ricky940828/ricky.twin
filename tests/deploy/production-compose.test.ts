// @vitest-environment node
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("production compose", () => {
  it("binds the application to a configurable localhost port", async () => {
    const compose = await readFile(join(process.cwd(), "compose.production.yaml"), "utf8");
    const imageEnvironment = await readFile(join(process.cwd(), "deploy", "image.env.example"), "utf8");

    expect(compose).toContain('127.0.0.1:${RICKY_TWIN_HOST_PORT:?RICKY_TWIN_HOST_PORT is required}:3000');
    expect(imageEnvironment).toContain("RICKY_TWIN_HOST_PORT=3100");
  });
});
