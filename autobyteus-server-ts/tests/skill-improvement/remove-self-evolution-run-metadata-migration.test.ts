import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RemoveSelfEvolutionRunMetadataMigration } from "../../src/app-data-migrations/migrations/remove-self-evolution-run-metadata-migration.js";

const pathExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
};

describe("RemoveSelfEvolutionRunMetadataMigration", () => {
  let memoryDir: string;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "self-evolution-migration-"));
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("removes standalone and recursive team member selfEvolutionEffective fields", async () => {
    const runDir = path.join(memoryDir, "agents", "run-1");
    const skippedRunDir = path.join(memoryDir, "agents", "run-2");
    const teamDir = path.join(memoryDir, "agent_teams", "team-1");
    await fs.mkdir(runDir, { recursive: true });
    await fs.mkdir(skippedRunDir, { recursive: true });
    await fs.mkdir(teamDir, { recursive: true });
    await fs.writeFile(path.join(runDir, "run_metadata.json"), JSON.stringify({
      runId: "run-1",
      selfEvolutionEffective: { enabled: true },
      retained: true,
    }), "utf-8");
    await fs.writeFile(path.join(skippedRunDir, "run_metadata.json"), JSON.stringify({
      runId: "run-2",
      retained: true,
    }), "utf-8");
    await fs.writeFile(path.join(teamDir, "team_run_metadata.json"), JSON.stringify({
      teamRunId: "team-1",
      memberTree: [
        { memberKind: "agent", memberRunId: "member-1", selfEvolutionEffective: { enabled: true } },
        { memberKind: "agent_team", memberRunId: "subteam", memberTree: [
          { memberKind: "agent", memberRunId: "member-2", selfEvolutionEffective: { enabled: false } },
        ] },
      ],
    }), "utf-8");

    const result = await new RemoveSelfEvolutionRunMetadataMigration(memoryDir).execute();

    expect(result.status).toBe("SUCCEEDED");
    expect(result.summary.scannedCount).toBe(3);
    expect(result.summary.migratedCount).toBe(2);
    expect(result.summary.skippedCount).toBe(1);
    expect(result.summary.failedCount).toBe(0);
    const runPayload = JSON.parse(await fs.readFile(path.join(runDir, "run_metadata.json"), "utf-8"));
    const teamPayload = JSON.parse(await fs.readFile(path.join(teamDir, "team_run_metadata.json"), "utf-8"));
    expect(runPayload).not.toHaveProperty("selfEvolutionEffective");
    expect(runPayload.retained).toBe(true);
    expect(teamPayload.memberTree[0]).not.toHaveProperty("selfEvolutionEffective");
    expect(teamPayload.memberTree[1].memberTree[0]).not.toHaveProperty("selfEvolutionEffective");
    expect(result.summary.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemId: "agent:run-1", status: "MIGRATED", backupPath: expect.stringContaining("run_metadata.json.backup-") }),
      expect.objectContaining({ itemId: "team:team-1", status: "MIGRATED", backupPath: expect.stringContaining("team_run_metadata.json.backup-") }),
      expect.objectContaining({ itemId: "agent:run-2", status: "SKIPPED", message: "No obsolete selfEvolutionEffective fields found." }),
    ]));
    for (const detail of result.summary.details.filter((item) => item.status === "MIGRATED")) {
      expect(detail.backupPath).toBeTruthy();
      await expect(pathExists(detail.backupPath!)).resolves.toBe(true);
    }
  });
});
