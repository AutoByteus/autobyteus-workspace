import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RemoveGlobalSkillDiscoveryModeMigration } from "../../../src/app-data-migrations/migrations/remove-global-skill-discovery-mode-migration.js";

let tempRoot: string;
let memoryDir: string;
let appDataDir: string;

const LEGACY_MODE = "GLOBAL_DISCOVERY";

const writeJson = async (filePath: string, value: unknown): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
};

const readJson = async <T = any>(filePath: string): Promise<T> =>
  JSON.parse(await fs.readFile(filePath, "utf-8")) as T;

const expectNoLegacyMode = (value: unknown): void => {
  expect(JSON.stringify(value)).not.toContain(LEGACY_MODE);
};

describe("RemoveGlobalSkillDiscoveryModeMigration", () => {
  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "remove-global-skill-discovery-"));
    memoryDir = path.join(tempRoot, "memory");
    appDataDir = path.join(tempRoot, "app-data");
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("rewrites persisted GLOBAL_DISCOVERY values across run, team, and channel metadata", async () => {
    const agentMetadataPath = path.join(memoryDir, "agents", "agent-run-1", "run_metadata.json");
    const teamMetadataPath = path.join(memoryDir, "agent_teams", "team-run-1", "team_run_metadata.json");
    const channelBindingsPath = path.join(appDataDir, "external-channel", "bindings.json");
    const unrelatedJsonPath = path.join(memoryDir, "agents", "agent-run-1", "unrelated.json");

    await writeJson(agentMetadataPath, {
      agentRunId: "agent-run-1",
      skillAccessMode: LEGACY_MODE,
    });
    await writeJson(teamMetadataPath, {
      teamRunId: "team-run-1",
      memberTree: [
        {
          memberKind: "agent",
          memberRouteKey: "lead",
          config: { skillAccessMode: LEGACY_MODE },
        },
        {
          memberKind: "agent",
          memberRouteKey: "reviewer",
          skillAccessMode: SkillAccessMode.NONE,
        },
      ],
    });
    await writeJson(channelBindingsPath, {
      bindings: [
        {
          bindingId: "agent-binding",
          launchPreset: { skillAccessMode: LEGACY_MODE },
        },
        {
          bindingId: "team-binding",
          launchPreset: {
            memberConfigs: [{ skillAccessMode: LEGACY_MODE }],
          },
        },
      ],
    });
    await writeJson(unrelatedJsonPath, { skillAccessMode: LEGACY_MODE });

    const result = await new RemoveGlobalSkillDiscoveryModeMigration(memoryDir, appDataDir).execute();

    expect(result.status).toBe("SUCCEEDED");
    expect(result.summary.scannedCount).toBe(3);
    expect(result.summary.migratedCount).toBe(3);
    expect(result.summary.failedCount).toBe(0);
    expect(result.summary.details.every((detail) => detail.backupPath)).toBe(true);

    const agentMetadata = await readJson(agentMetadataPath);
    const teamMetadata = await readJson(teamMetadataPath);
    const channelBindings = await readJson(channelBindingsPath);
    const unrelatedJson = await readJson(unrelatedJsonPath);

    expectNoLegacyMode(agentMetadata);
    expectNoLegacyMode(teamMetadata);
    expectNoLegacyMode(channelBindings);
    expect(agentMetadata.skillAccessMode).toBe(SkillAccessMode.PRELOADED_ONLY);
    expect(teamMetadata.memberTree[0].config.skillAccessMode).toBe(SkillAccessMode.PRELOADED_ONLY);
    expect(teamMetadata.memberTree[1].skillAccessMode).toBe(SkillAccessMode.NONE);
    expect(channelBindings.bindings[0].launchPreset.skillAccessMode).toBe(SkillAccessMode.PRELOADED_ONLY);
    expect(channelBindings.bindings[1].launchPreset.memberConfigs[0].skillAccessMode).toBe(
      SkillAccessMode.PRELOADED_ONLY,
    );
    expect(unrelatedJson.skillAccessMode).toBe(LEGACY_MODE);

    const secondResult = await new RemoveGlobalSkillDiscoveryModeMigration(memoryDir, appDataDir).execute();
    expect(secondResult.status).toBe("SUCCEEDED");
    expect(secondResult.summary.migratedCount).toBe(0);
    expect(secondResult.summary.skippedCount).toBe(3);
  });
});
