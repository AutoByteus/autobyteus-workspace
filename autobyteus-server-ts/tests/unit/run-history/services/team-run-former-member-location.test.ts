import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentMemoryLayout } from "../../../../src/agent-memory/store/agent-memory-layout.js";
import { TeamRunExecutionTreeLocationService } from "../../../../src/run-history/services/team-run-execution-tree-location-service.js";
import { resetRootRunPackageReadinessIndex } from "../../../../src/run-history/services/root-run-package-readiness-index.js";
import { TeamMemberRunViewProjectionService } from "../../../../src/run-history/services/team-member-run-view-projection-service.js";
import { noDelegations } from "../../../helpers/no-delegations.js";
import { testAgentNode, testExecutionTree, writeCurrentTeamRunPackage } from "../../../fixtures/current-team-run-fixtures.js";

const STORED_ONLY_MANAGER = { getManagedTeamRun: () => null, listManagedTeamRunIds: () => [] };

/** A former member stays in its run's history: found by its run ID, listed with the run's agents, never by its address alone. */
describe("TeamRunExecutionTreeLocationService former members", () => {
  let memoryDir: string;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "team-run-former-member-location-"));
    const tree = testExecutionTree({
      rootTeamRunId: "team-run", coordinatorAddress: "/lead",
      children: [testAgentNode("/lead", { agentRunId: "lead-run" }),
        testAgentNode("/writer", { agentRunId: "writer-run", workspaceRootPath: "/ws/writer", platformAgentRunId: "writer-thread" }),
        testAgentNode("/coder", { agentRunId: "coder-run", workspaceRootPath: "/ws/coder", platformAgentRunId: "coder-thread" })],
    });
    const [lead, writer, coder] = tree.rootTeam.members;
    // The writer was swapped for another agent at the same address (DEC-006), then stopped; the coder is still leaving.
    const poet = { ...writer!, agentRunId: "poet-run", agentDefinitionId: "agent-poet", launchConfiguration: { ...writer!.launchConfiguration, workspaceRootPath: "/ws/poet" } };
    await writeCurrentTeamRunPackage(new AgentMemoryLayout(memoryDir).getTeamDirPath({ rootTeamRunId: "team-run", ancestorTeamRunIds: [] }),
      { ...tree, handoffs: [], rootTeam: { ...tree.rootTeam, members: [lead!, poet], formerMembers: [writer!, { ...coder!, leaving: true }] } });
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
    expect((await service.listAgents({ rootTeamRunId: "team-run" })).map((item) => item.agentRunId)).toEqual(["lead-run", "poet-run", "writer-run", "coder-run"]);
  });

  it("CR-003: a leaving or stopped former member is located with its own stored node (launch and provider binding), never the current member's at its address", async () => {
    const service = new TeamRunExecutionTreeLocationService({ memoryDir, manager: STORED_ONLY_MANAGER });
    const writer = await service.findAgent({ rootTeamRunId: "team-run", agentRunId: "writer-run" });
    expect(writer?.configuredPlacement).toMatchObject({ agentRunId: "writer-run", agentDefinitionId: "agent-writer", launchConfiguration: { workspaceRootPath: "/ws/writer" } });
    const coder = await service.findAgent({ rootTeamRunId: "team-run", agentRunId: "coder-run" });
    expect(coder?.configuredPlacement).toMatchObject({ agentRunId: "coder-run", platformAgentRunId: "coder-thread" });
    expect(coder?.configuredPlacement).not.toHaveProperty("leaving");
  });

  it("CR-003: a leaving member's projection and file changes open by run ID, and a stopped former member's conversation too (REQ-002)", async () => {
    const locations = new TeamRunExecutionTreeLocationService({ memoryDir, manager: STORED_ONLY_MANAGER });
    const agentViews = { getProjectionFromMetadata: vi.fn(async (input: { runId: string }) => ({ runId: input.runId, conversation: [], activities: [], summary: null,
      lastActivityAt: null, hasEarlierActiveTraceEvents: false })) };
    const fileChanges = { getLocatedCollaborationMemberProjection: vi.fn(async () => [{ path: "a.ts" }]) };
    const projections = new TeamMemberRunViewProjectionService({ tree: noDelegations(), peerRunOf: () => null, locations: locations as never,
      agentRunViewProjectionService: agentViews as never, runFileChangeProjectionService: fileChanges as never });
    await expect(projections.getProjection("team-run", "coder-run")).resolves.toMatchObject({ agentRunId: "coder-run" });
    expect(agentViews.getProjectionFromMetadata).toHaveBeenLastCalledWith(expect.objectContaining({ metadata: expect.objectContaining({
      runId: "coder-run", agentDefinitionId: "agent-coder", workspaceRootPath: "/ws/coder", platformAgentRunId: "coder-thread" }) }));
    await expect(projections.getFileChanges("team-run", "coder-run")).resolves.toEqual([{ path: "a.ts" }]);
    await expect(projections.getProjection("team-run", "writer-run")).resolves.toMatchObject({ agentRunId: "writer-run" });
    expect(agentViews.getProjectionFromMetadata).toHaveBeenLastCalledWith(expect.objectContaining({ metadata: expect.objectContaining({
      workspaceRootPath: "/ws/writer", platformAgentRunId: "writer-thread" }) }));
  });
});
