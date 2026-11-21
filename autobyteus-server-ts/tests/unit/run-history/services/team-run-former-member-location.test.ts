import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AgentMemoryLayout } from "../../../../src/agent-memory/store/agent-memory-layout.js";
import { TeamRunExecutionTreeLocationService } from "../../../../src/run-history/services/team-run-execution-tree-location-service.js";
import { resetRootRunPackageReadinessIndex } from "../../../../src/run-history/services/root-run-package-readiness-index.js";
import { testAgentNode, testExecutionTree, writeCurrentTeamRunPackage } from "../../../fixtures/current-team-run-fixtures.js";

const STORED_ONLY_MANAGER = { getManagedTeamRun: () => null, listManagedTeamRunIds: () => [] };

/** A former member stays in its run's history: found by its run ID, listed with the run's agents, never by its address alone. */
describe("TeamRunExecutionTreeLocationService former members", () => {
  let memoryDir: string;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "team-run-former-member-location-"));
    const tree = testExecutionTree({
      rootTeamRunId: "team-run", coordinatorAddress: "/lead",
      children: [testAgentNode("/lead", { agentRunId: "lead-run" }), testAgentNode("/writer", { agentRunId: "writer-run" })],
    });
    const [lead, writer] = tree.rootTeam.members;
    // The writer was swapped for another agent at the same address (DEC-006).
    const poet = { ...writer!, agentRunId: "poet-run", agentDefinitionId: "agent-poet" };
    await writeCurrentTeamRunPackage(new AgentMemoryLayout(memoryDir).getTeamDirPath({ rootTeamRunId: "team-run", ancestorTeamRunIds: [] }),
      { ...tree, handoffs: [], rootTeam: { ...tree.rootTeam, members: [lead!, poet], formerMembers: [writer!] } });
  });

  afterEach(async () => {
    resetRootRunPackageReadinessIndex(memoryDir);
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("finds a former member by its run ID with its own memory folder; its address finds the current member", async () => {
    const service = new TeamRunExecutionTreeLocationService({ memoryDir, manager: STORED_ONLY_MANAGER });
    await expect(service.findAgent({ rootTeamRunId: "team-run", agentRunId: "writer-run" })).resolves.toMatchObject({
      agentRunId: "writer-run", memberAddress: "/writer", memoryDir: path.join(memoryDir, "agent_teams", "team-run", "writer-run"),
    });
    await expect(service.findAgent({ rootTeamRunId: "team-run", memberAddress: "/writer" })).resolves.toMatchObject({ agentRunId: "poet-run" });
  });

  it("lists the run's members, then its former members", async () => {
    const service = new TeamRunExecutionTreeLocationService({ memoryDir, manager: STORED_ONLY_MANAGER });
    expect((await service.listAgents({ rootTeamRunId: "team-run" })).map((item) => item.agentRunId)).toEqual(["lead-run", "poet-run", "writer-run"]);
  });
});
