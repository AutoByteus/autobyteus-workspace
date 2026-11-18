import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  configureNodeIdentityCapability,
  NodeIdentityNotMigratedError,
  NodeIdentityService,
} from "../../../src/remote-access/services/node-identity-service.js";

const tempDirs: string[] = [];

const makeTempDir = async (): Promise<string> => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-node-identity-"));
  tempDirs.push(tempDir);
  return tempDir;
};

beforeEach(() => configureNodeIdentityCapability(true));
afterEach(async () => {
  configureNodeIdentityCapability(true);
  await Promise.all(tempDirs.splice(0).map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })));
});

describe("NodeIdentityService", () => {
  it("creates the node ID once in remote-access/node-identity.json and keeps it", async () => {
    const appDataDir = await makeTempDir();
    const service = new NodeIdentityService({ getAppDataDir: () => appDataDir });

    const firstId = await service.getNodeId();
    const secondId = await new NodeIdentityService({ getAppDataDir: () => appDataDir }).getNodeId();

    expect(firstId).toMatch(/^srv_[A-Za-z0-9_-]{32,}$/);
    expect(secondId).toBe(firstId);
    const stored = JSON.parse(await fs.readFile(path.join(appDataDir, "remote-access", "node-identity.json"), "utf-8"));
    expect(stored).toMatchObject({ nodeId: firstId });
    expect(typeof stored.createdAt).toBe("string");
  });

  it("reads an existing node-identity.json", async () => {
    const appDataDir = await makeTempDir();
    const nodeId = "srv_existing_node_id_0000000000000000000";
    await fs.mkdir(path.join(appDataDir, "remote-access"), { recursive: true });
    await fs.writeFile(path.join(appDataDir, "remote-access", "node-identity.json"), JSON.stringify({ nodeId }));

    await expect(new NodeIdentityService({ getAppDataDir: () => appDataDir }).getNodeId()).resolves.toBe(nodeId);
  });

  it("while the identity is held back (REQ-913): throws NodeIdentityNotMigratedError and creates or writes nothing", async () => {
    const appDataDir = await makeTempDir();
    configureNodeIdentityCapability(false);

    const service = new NodeIdentityService({ getAppDataDir: () => appDataDir });
    await expect(service.getNodeId()).rejects.toBeInstanceOf(NodeIdentityNotMigratedError);
    await expect(service.getNodeId()).rejects.toMatchObject({
      code: "NODE_IDENTITY_NOT_MIGRATED",
      message: "This node's identity is waiting for its data migration.",
    });
    await expect(fs.readdir(appDataDir)).resolves.toEqual([]);
  });
});
