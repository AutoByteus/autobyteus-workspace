import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TeamRunExecutionTreeSnapshot } from "../../../src/agent-team-execution/domain/team-run-execution-tree.js";
import { AgentMemoryLocationService } from "../../../src/agent-memory/services/agent-memory-location-service.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { TeamRunExecutionTreeStore } from "../../../src/run-history/store/team-run-execution-tree-store.js";
import { address, testAgentNode, testAgentTeamNode, testExecutionTree } from "../../fixtures/current-team-run-fixtures.js";

const withTaskAgent = (tree: TeamRunExecutionTreeSnapshot): TeamRunExecutionTreeSnapshot => ({
  ...tree,
  rootTeam: {
    ...tree.rootTeam,
    taskExecutions: [{
      address: address("/writer"),
      agentRunId: "task-writer-run",
      platformAgentRunId: null,
      startedAt: "2026-08-15T00:01:00.000Z",
      settledAt: null,
    }],
  },
});

describe("AgentMemoryLocationService current V1 tree", () => {
  let memoryDir: string;
  let layout: AgentMemoryLayout;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-memory-location-current-"));
    layout = new AgentMemoryLayout(memoryDir);
    const tree = withTaskAgent(testExecutionTree({
      rootTeamRunId: "root-team-run",
      rootTeamDefinitionId: "classroom",
      coordinatorAddress: "/writer",
      children: [
        testAgentNode("/writer", { agentRunId: "writer-run" }),
        testAgentTeamNode({
          address: "/ReviewSquad",
          coordinatorAddress: "/ReviewSquad/reviewer",
          teamRunId: "review-team-run",
          children: [testAgentNode("/ReviewSquad/reviewer", { agentRunId: "reviewer-run" })],
        }),
      ],
    }));
    await new TeamRunExecutionTreeStore().write(
      layout.getTeamDirPath({ rootTeamRunId: "root-team-run", ancestorTeamRunIds: [] }),
      tree,
    );
  });

  afterEach(async () => fs.rm(memoryDir, { recursive: true, force: true }));

  it("derives configured and task Agent memory from exact root, physical Team ancestry, and AgentRun IDs", async () => {
    const service = new AgentMemoryLocationService({ memoryDir });
    const locations = await service.listTeamMemberLocations({ teamRunId: "root-team-run" });

    expect(locations.map((item) => ({
      address: item.memberAddress,
      run: item.agentRunId,
      ancestors: item.ancestorTeamRunIds,
      configured: item.configuredPlacement !== null,
      memoryDir: item.memoryDir,
    }))).toEqual([
      {
        address: "/writer",
        run: "writer-run",
        ancestors: [],
        configured: true,
        memoryDir: path.join(memoryDir, "agent_teams", "root-team-run", "writer-run"),
      },
      {
        address: "/ReviewSquad/reviewer",
        run: "reviewer-run",
        ancestors: ["review-team-run"],
        configured: true,
        memoryDir: path.join(memoryDir, "agent_teams", "root-team-run", "review-team-run", "reviewer-run"),
      },
      {
        address: "/writer",
        run: "task-writer-run",
        ancestors: [],
        configured: true,
        memoryDir: path.join(memoryDir, "agent_teams", "root-team-run", "task-writer-run"),
      },
    ]);
  });

  it("resolves only one exact current address/run match while retaining its configured launch placement", async () => {
    const service = new AgentMemoryLocationService({ memoryDir });

    await expect(service.resolveTeamMemberLocation({
      teamRunId: "root-team-run",
      memberAddress: "/ReviewSquad/reviewer",
      agentRunId: "reviewer-run",
    })).resolves.toMatchObject({
      memberAddress: "/ReviewSquad/reviewer",
      agentRunId: "reviewer-run",
      ancestorTeamRunIds: ["review-team-run"],
    });
    await expect(service.resolveTeamMemberLocation({
      teamRunId: "root-team-run",
      memberAddress: "/writer",
    })).resolves.toBeNull();
    await expect(service.resolveTeamMemberLocation({
      teamRunId: "root-team-run",
      memberAddress: "/writer",
      agentRunId: "missing",
    })).resolves.toBeNull();
  });

  it("keeps standalone and Team memory identity separate", () => {
    const service = new AgentMemoryLocationService({ memoryDir });
    expect(service.getStandaloneLocation({ agentRunId: "standalone-run" })).toEqual({
      kind: "standalone",
      agentRunId: "standalone-run",
      memoryDir: path.join(memoryDir, "agents", "standalone-run"),
    });
    expect(service.getTeamAgentRunLocation({
      rootTeamRunId: "root-team-run",
      ancestorTeamRunIds: ["review-team-run"],
      agentRunId: "reviewer-run",
    })).toMatchObject({
      kind: "team_agent_run",
      rootTeamRunId: "root-team-run",
      ancestorTeamRunIds: ["review-team-run"],
      agentRunId: "reviewer-run",
    });
  });
});
