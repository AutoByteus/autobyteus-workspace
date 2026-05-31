import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { afterEach, describe, expect, it } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { TeamMemoryExplorerService } from "../../../src/agent-memory/services/team-memory-explorer-service.js";
import { TeamRunMetadataStore } from "../../../src/run-history/store/team-run-metadata-store.js";

const touch = (filePath: string, mtime: number) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "{}", "utf-8");
  fs.utimesSync(filePath, mtime, mtime);
};

const member = (memberRunId: string, memberName: string) => ({
  memberKind: "agent" as const,
  memberRouteKey: memberName.toLowerCase(),
  memberPath: [memberName],
  memberName,
  memberRunId,
  runtimeKind: RuntimeKind.AUTOBYTEUS,
  platformAgentRunId: null,
  agentDefinitionId: `${memberName.toLowerCase()}-agent`,
  llmModelIdentifier: "model-a",
  autoExecuteTools: false,
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  llmConfig: null,
  workspaceRootPath: null,
});

describe("TeamMemoryExplorerService", () => {
  let tempDir: string | null = null;

  afterEach(() => {
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  const writeTeamMetadata = async (
    teamRunId: string,
    teamDefinitionId: string,
    teamDefinitionName: string,
    memberRunId: string,
    memberName = "Coordinator",
  ) => {
    if (!tempDir) {
      throw new Error("tempDir not initialized");
    }
    await new TeamRunMetadataStore(tempDir).writeMetadata(teamRunId, {
      teamRunId,
      teamDefinitionId,
      teamDefinitionName,
      coordinatorMemberRouteKey: memberName.toLowerCase(),
      createdAt: "2026-03-07T00:00:00Z",
      memberTree: [member(memberRunId, memberName)],
    });
  };

  it("lists only agent teams with inspectable member memory", async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "team-memory-explorer-"));
    await writeTeamMetadata("team-alpha-1", "alpha-team", "Alpha Team", "alpha-member-1");
    await writeTeamMetadata("team-alpha-2", "alpha-team", "Alpha Team", "alpha-member-2");
    await writeTeamMetadata("team-empty", "empty-team", "Empty Team", "empty-member");
    touch(path.join(tempDir, "agent_teams", "team-alpha-1", "alpha-member-1", "raw_traces.jsonl"), 1000);
    touch(path.join(tempDir, "agent_teams", "team-alpha-2", "alpha-member-2", "semantic.jsonl"), 2000);

    const page = await new TeamMemoryExplorerService(tempDir).listAgentTeamsWithMemory();

    expect(page.entries).toHaveLength(1);
    expect(page.entries[0]?.teamDefinitionId).toBe("alpha-team");
    expect(page.entries[0]?.teamRunCount).toBe(2);
    expect(page.entries[0]?.memberMemoryCount).toBe(1);
    expect(page.entries[0]?.memory.hasRawTraces).toBe(true);
    expect(page.entries[0]?.memory.hasSemantic).toBe(true);
  });

  it("lists selected team runs with member memory targets only", async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "team-memory-explorer-"));
    await writeTeamMetadata("team-alpha-1", "alpha-team", "Alpha Team", "alpha-member-1");
    await writeTeamMetadata("team-beta-1", "beta-team", "Beta Team", "beta-member-1");
    touch(path.join(tempDir, "agent_teams", "team-alpha-1", "alpha-member-1", "raw_traces.jsonl"), 1000);
    touch(path.join(tempDir, "agent_teams", "team-beta-1", "beta-member-1", "raw_traces.jsonl"), 2000);

    const page = await new TeamMemoryExplorerService(tempDir).listAgentTeamRunsWithMemory("alpha-team");

    expect(page.entries.map((entry) => entry.teamRunId)).toEqual(["team-alpha-1"]);
    expect(page.entries[0]?.memberTargets).toHaveLength(1);
    expect(page.entries[0]?.memberTargets[0]?.memberRunId).toBe("alpha-member-1");
  });
});
