import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NodeIdentityFileNameMigration } from "../../../src/app-data-migrations/migrations/node-identity-file-name/node-identity-file-name-migration.js";

/**
 * autobyteus-290 SM-1: `remote-access/server-instance.json` {serverInstanceId} → `remote-access/node-identity.json`
 * {nodeId}. The fixtures are the released writer's exact output (`ServerInstanceIdentityService` before 290).
 */

const NODE_ID = "srv_m9VFq2LwAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const OTHER_ID = "srv_someone_else_000000000000000000000000";
const CREATED_AT = "2026-06-01T08:00:00.000Z";

let appDataDir: string;
const folder = () => path.join(appDataDir, "remote-access");
const oldFile = () => path.join(folder(), "server-instance.json");
const newFile = () => path.join(folder(), "node-identity.json");
const exists = (file: string) => fs.access(file).then(() => true, () => false);
const writeReleased = async (value: unknown, raw?: string) => {
  await fs.mkdir(folder(), { recursive: true });
  // The released writer's output: writeJsonFile, two-space JSON.
  await fs.writeFile(oldFile(), raw ?? JSON.stringify(value, null, 2));
};
const run = () => new NodeIdentityFileNameMigration(appDataDir).execute();

beforeEach(async () => { appDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-sm1-")); });
afterEach(async () => { await fs.rm(appDataDir, { recursive: true, force: true }); });

describe("NodeIdentityFileNameMigration (SM-1)", () => {
  it("holds back node_identity and runs on startup", () => {
    const migration = new NodeIdentityFileNameMigration("/unused");
    expect(migration.holdsBackCapabilities).toEqual(["node_identity"]);
    expect(migration.requiredOnStartup).toBe(true);
  });

  it("renames the released file to node-identity.json with the same ID and createdAt, then removes the old one", async () => {
    await writeReleased({ serverInstanceId: NODE_ID, createdAt: CREATED_AT });

    const result = await run();

    expect(result.status).toBe("SUCCEEDED");
    expect(result.summary).toMatchObject({ migratedCount: 1, failedCount: 0 });
    expect(JSON.parse(await fs.readFile(newFile(), "utf-8"))).toEqual({ nodeId: NODE_ID, createdAt: CREATED_AT });
    expect(await exists(oldFile())).toBe(false);
    // The released file is kept as a backup next to it, reported in the detail; no temporary file is left behind.
    const files = (await fs.readdir(folder())).sort();
    expect(files).toEqual(["node-identity.json", expect.stringMatching(/^server-instance\.json\.backup-/)]);
    const backup = files.find((name) => name.startsWith("server-instance.json.backup-"))!;
    expect(JSON.parse(await fs.readFile(path.join(folder(), backup), "utf-8"))).toEqual({ serverInstanceId: NODE_ID, createdAt: CREATED_AT });
    expect(result.summary.details[0]?.backupPath).toBe(path.join(folder(), backup));
  });

  it("a fresh install, or a re-run after success, has nothing to do", async () => {
    await expect(run()).resolves.toMatchObject({ status: "SUCCEEDED", summary: { skippedCount: 1 } });
    await writeReleased({ serverInstanceId: NODE_ID, createdAt: CREATED_AT });
    await run();
    await expect(run()).resolves.toMatchObject({ status: "SUCCEEDED", summary: { skippedCount: 1, migratedCount: 0 } });
    expect(JSON.parse(await fs.readFile(newFile(), "utf-8")).nodeId).toBe(NODE_ID);
  });

  it("a crash between writing the new file and removing the old one re-runs safely: same value keeps the new one", async () => {
    await writeReleased({ serverInstanceId: NODE_ID, createdAt: CREATED_AT });
    await fs.writeFile(newFile(), JSON.stringify({ nodeId: NODE_ID, createdAt: CREATED_AT }));

    await expect(run()).resolves.toMatchObject({ status: "SUCCEEDED", summary: { migratedCount: 1 } });
    expect(await exists(oldFile())).toBe(false);
    expect(JSON.parse(await fs.readFile(newFile(), "utf-8")).nodeId).toBe(NODE_ID);
  });

  it("both files with different IDs fail, keep both and name both files (N-906)", async () => {
    await writeReleased({ serverInstanceId: NODE_ID, createdAt: CREATED_AT });
    await fs.writeFile(newFile(), JSON.stringify({ nodeId: OTHER_ID }));

    const result = await run();

    expect(result.status).toBe("FAILED");
    expect(result.errorMessage).toContain("server-instance.json");
    expect(result.errorMessage).toContain("node-identity.json");
    expect(await exists(oldFile())).toBe(true);
    expect(JSON.parse(await fs.readFile(newFile(), "utf-8")).nodeId).toBe(OTHER_ID);
  });

  it("an unreadable or ID-less released file fails and is kept", async () => {
    await writeReleased(null, "{not json");
    await expect(run()).resolves.toMatchObject({ status: "FAILED" });
    expect(await exists(oldFile())).toBe(true);

    await writeReleased({ createdAt: CREATED_AT });
    await expect(run()).resolves.toMatchObject({ status: "FAILED" });
    expect(await exists(oldFile())).toBe(true);
    expect(await exists(newFile())).toBe(false);
  });

  it("a released file without createdAt is renamed without one", async () => {
    await writeReleased({ serverInstanceId: NODE_ID });
    await run();
    expect(JSON.parse(await fs.readFile(newFile(), "utf-8"))).toEqual({ nodeId: NODE_ID });
  });
});
