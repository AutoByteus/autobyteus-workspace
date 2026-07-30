import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  PRE_LINEAGE_DERIVED_MEMORY_FILE_NAMES,
} from "../../../src/app-data-migrations/migrations/reset-pre-lineage-memory-files.js";
import {
  ResetPreLineageMemoryAppDataMigration,
} from "../../../src/app-data-migrations/migrations/reset-pre-lineage-memory-app-data-migration.js";

let memoryDir: string;

const exists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.lstat(filePath);
    return true;
  } catch {
    return false;
  }
};

const seedRun = async (relativeDir: string, rawBytes: Buffer): Promise<string> => {
  const runDir = path.join(memoryDir, relativeDir);
  await fs.mkdir(runDir, { recursive: true });
  await Promise.all(PRE_LINEAGE_DERIVED_MEMORY_FILE_NAMES.map((fileName) =>
    fs.writeFile(path.join(runDir, fileName), `obsolete:${fileName}\n`, "utf-8")));
  await fs.writeFile(path.join(runDir, "raw_traces_active.jsonl"), rawBytes);
  await fs.writeFile(path.join(runDir, "raw_traces_manifest.json"), "raw-manifest");
  await fs.writeFile(path.join(runDir, "raw_traces_archive_manifest.json"), "raw-archive-manifest");
  return runDir;
};

describe("ResetPreLineageMemoryAppDataMigration", () => {
  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "reset-pre-lineage-memory-"));
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("deletes exactly four derived files from standalone/direct/nested member runs and preserves raw evidence byte-for-byte", async () => {
    const teamRoot = path.join(memoryDir, "agent_teams", "team-run");
    await fs.mkdir(teamRoot, { recursive: true });
    await fs.writeFile(path.join(teamRoot, "team_run_metadata.json"), "{}\n");
    const runs = [
      await seedRun("agents/standalone-run", Buffer.from([0, 1, 2, 3, 255])),
      await seedRun("agent_teams/team-run/member-direct", Buffer.from("direct raw\n")),
      await seedRun("agent_teams/team-run/nested-team/member-nested", Buffer.from("nested raw\n")),
    ];
    const rawBefore = await Promise.all(runs.map((runDir) =>
      fs.readFile(path.join(runDir, "raw_traces_active.jsonl"))));

    const first = await new ResetPreLineageMemoryAppDataMigration(memoryDir).execute();

    expect(first.status).toBe("SUCCEEDED");
    expect(first.summary).toMatchObject({
      scannedCount: 12,
      migratedCount: 12,
      skippedCount: 0,
      failedCount: 0,
    });
    for (const [index, runDir] of runs.entries()) {
      for (const fileName of PRE_LINEAGE_DERIVED_MEMORY_FILE_NAMES) {
        expect(await exists(path.join(runDir, fileName))).toBe(false);
      }
      expect(await fs.readFile(path.join(runDir, "raw_traces_active.jsonl")))
        .toEqual(rawBefore[index]);
      expect(await fs.readFile(path.join(runDir, "raw_traces_manifest.json"), "utf-8"))
        .toBe("raw-manifest");
      expect(await fs.readFile(
        path.join(runDir, "raw_traces_archive_manifest.json"),
        "utf-8",
      )).toBe("raw-archive-manifest");
    }
    expect(await exists(path.join(teamRoot, "working_context_snapshot.json"))).toBe(false);

    const second = await new ResetPreLineageMemoryAppDataMigration(memoryDir).execute();
    expect(second.status).toBe("SUCCEEDED");
    expect(second.summary).toMatchObject({
      scannedCount: 12,
      migratedCount: 0,
      skippedCount: 12,
      failedCount: 0,
    });
  });

  it("returns an itemized FAILED result when any exact target cannot be unlinked", async () => {
    const runDir = await seedRun("agents/failing-run", Buffer.from("raw stays\n"));
    await fs.rm(path.join(runDir, "episodic.jsonl"));
    await fs.mkdir(path.join(runDir, "episodic.jsonl"));

    const result = await new ResetPreLineageMemoryAppDataMigration(memoryDir).execute();

    expect(result.status).toBe("FAILED");
    expect(result.errorMessage).toContain("1 pre-lineage");
    expect(result.summary).toMatchObject({
      scannedCount: 4,
      migratedCount: 3,
      skippedCount: 0,
      failedCount: 1,
    });
    expect(result.summary.details).toEqual(expect.arrayContaining([
      expect.objectContaining({
        itemId: "agents/failing-run:episodic.jsonl",
        status: "FAILED",
      }),
    ]));
    expect(await fs.readFile(path.join(runDir, "raw_traces_active.jsonl"), "utf-8"))
      .toBe("raw stays\n");
  });
});
