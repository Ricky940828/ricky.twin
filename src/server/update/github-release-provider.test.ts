import { describe, expect, it, vi } from "vitest";

import { createGitHubReleaseProvider } from "./github-release-provider";

describe("private GitHub release provider", () => {
  it("loads and validates the manifest asset from the latest release", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          tag_name: "v0.2.0",
          assets: [
            {
              name: "update-manifest.json",
              url: "https://api.github.test/assets/1",
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          schemaVersion: 1,
          version: "0.2.0",
          releaseTag: "v0.2.0",
          image: "ghcr.io/ricky940828/ricky.twin@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          publishedAt: "2026-08-12T00:00:00.000Z",
          minimumDataSchemaVersion: 1,
          maximumDataSchemaVersion: 1,
          requiredUpdaterVersion: "1.0.0",
          notes: ["安全在线升级"],
        }),
      );
    const provider = createGitHubReleaseProvider({
      repository: "Ricky940828/ricky.twin",
      token: "github-read-token",
      fetcher,
    });

    await expect(provider.getLatest()).resolves.toMatchObject({
      version: "0.2.0",
      releaseTag: "v0.2.0",
    });
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "https://api.github.test/assets/1",
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: "application/octet-stream" }),
      }),
    );
  });

  it("rejects a release whose image is outside the fixed repository", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          tag_name: "v0.2.0",
          assets: [
            { name: "update-manifest.json", url: "https://asset.test/1" },
          ],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          schemaVersion: 1,
          version: "0.2.0",
          releaseTag: "v0.2.0",
          image: "ghcr.io/attacker/image@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          publishedAt: "2026-08-12T00:00:00.000Z",
          minimumDataSchemaVersion: 1,
          maximumDataSchemaVersion: 1,
          requiredUpdaterVersion: "1.0.0",
          notes: [],
        }),
      );

    await expect(
      createGitHubReleaseProvider({
        repository: "Ricky940828/ricky.twin",
        token: "token",
        fetcher,
      }).getLatest(),
    ).rejects.toThrow("发布镜像不在允许范围内");
  });
});

