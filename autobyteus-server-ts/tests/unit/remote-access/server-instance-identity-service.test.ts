import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ServerInstanceIdentityService } from "../../../src/remote-access/services/server-instance-identity-service.js";

const tempDirs: string[] = [];

const makeTempDir = async (): Promise<string> => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-server-instance-"));
  tempDirs.push(tempDir);
  return tempDir;
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })));
});

describe("ServerInstanceIdentityService", () => {
  it("persists a stable per-node server instance id", async () => {
    const appDataDir = await makeTempDir();
    const service = new ServerInstanceIdentityService({ getAppDataDir: () => appDataDir });

    const firstId = await service.getServerInstanceId();
    const secondService = new ServerInstanceIdentityService({ getAppDataDir: () => appDataDir });
    const secondId = await secondService.getServerInstanceId();

    expect(firstId).toMatch(/^srv_[A-Za-z0-9_-]{32,}$/);
    expect(secondId).toBe(firstId);
  });
});
