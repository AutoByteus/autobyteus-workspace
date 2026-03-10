import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MessagingGatewayReleaseManifestService } from "../../../../src/managed-capabilities/messaging-gateway/messaging-gateway-release-manifest-service.js";

const tempDirs: string[] = [];

describe("MessagingGatewayReleaseManifestService", () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.splice(0).map((dir) =>
        fs.rm(dir, { recursive: true, force: true }),
      ),
    );
  });

  it("resolves a descriptor when release metadata is synchronized", async () => {
    const manifestPath = await writeManifest({
      releaseTag: "v1.2.40",
      artifactVersion: "1.2.40",
    });

    const service = new MessagingGatewayReleaseManifestService({
      manifestPath,
    });

    await expect(
      service.resolveArtifact({
        serverVersion: "0.1.1",
        platformKey: "node-generic",
      }),
    ).resolves.toMatchObject({
      releaseTag: "v1.2.40",
      artifactVersion: "1.2.40",
    });
  });

  it("rejects semver release-tag drift that would hide a stale runtime install", async () => {
    const manifestPath = await writeManifest({
      releaseTag: "v1.2.40",
      artifactVersion: "0.1.0",
    });

    const service = new MessagingGatewayReleaseManifestService({
      manifestPath,
    });

    await expect(
      service.resolveArtifact({
        serverVersion: "0.1.1",
        platformKey: "node-generic",
      }),
    ).rejects.toThrow(
      "release tag 'v1.2.40' expects artifact version '1.2.40' but manifest declares '0.1.0'",
    );
  });

  it("allows non-release test tags to keep custom artifact fixture versions", async () => {
    const manifestPath = await writeManifest({
      releaseTag: "v-test-1",
      artifactVersion: "0.1.0",
    });

    const service = new MessagingGatewayReleaseManifestService({
      manifestPath,
    });

    await expect(
      service.resolveArtifact({
        serverVersion: "0.1.1",
        platformKey: "node-generic",
      }),
    ).resolves.toMatchObject({
      releaseTag: "v-test-1",
      artifactVersion: "0.1.0",
    });
  });
});

const writeManifest = async (input: {
  releaseTag: string;
  artifactVersion: string;
}): Promise<string> => {
  const dir = await fs.mkdtemp(
    path.join(os.tmpdir(), "managed-messaging-release-manifest-"),
  );
  tempDirs.push(dir);
  const manifestPath = path.join(dir, "release-manifest.json");
  await fs.writeFile(
    manifestPath,
    JSON.stringify(
      {
        schemaVersion: 1,
        releases: [
          {
            serverVersion: "0.1.1",
            releaseTag: input.releaseTag,
            artifactVersion: input.artifactVersion,
            platformKey: "node-generic",
            archiveType: "tar.gz",
            downloadUrl: "https://example.com/runtime.tar.gz",
            sha256Url: "https://example.com/runtime.tar.gz.sha256",
            metadataUrl: "https://example.com/runtime.tar.gz.json",
            supportedProviders: ["WHATSAPP"],
            excludedProviders: ["WECHAT"],
          },
        ],
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  return manifestPath;
};
