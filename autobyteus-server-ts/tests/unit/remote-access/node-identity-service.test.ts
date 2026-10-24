import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { NodeIdentityService } from "../../../src/remote-access/services/node-identity-service.js";

const tempDirs: string[] = [];

const makeTempDir = async (): Promise<string> => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-server-instance-"));
  tempDirs.push(tempDir);
  return tempDir;
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })));
});

describe("NodeIdentityService", () => {
  it("persists a stable per-node server instance id", async () => {
    const appDataDir = await makeTempDir();
    const service = new NodeIdentityService({ getAppDataDir: () => appDataDir });

    const firstId = await service.getNodeId();
    const secondService = new NodeIdentityService({ getAppDataDir: () => appDataDir });
    const secondId = await secondService.getNodeId();

    expect(firstId).toMatch(/^srv_[A-Za-z0-9_-]{32,}$/);
    expect(secondId).toBe(firstId);
  });
});
