import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TeamRunExecutionTreeSnapshot } from "../../../src/agent-team-execution/domain/team-run-execution-tree.js";
import { AgentMemoryLocationService } from "../../../src/agent-memory/services/agent-memory-location-service.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { TeamRunExecutionTreeStore } from "../../../src/run-history/store/team-run-execution-tree-store.js";
import { addTaskExecutionToTree } from "../../../src/agent-team-execution/services/team-run-execution-tree-mutator.js";
import { projectTaskTeamExecution } from "../../../src/agent-team-execution/task-delegation/task-execution-tree-projection.js";
import { TeamRunExecutionTreeLocationService } from "../../../src/run-history/services/team-run-execution-tree-location-service.js";
import { RootRunPackageReadinessIndex, resetRootRunPackageReadinessIndex } from "../../../src/run-history/services/root-run-package-readiness-index.js";
import { AgentOrgRunExecutionTreeStore } from "../../../src/run-history/store/agent-org-run-execution-tree-store.js";
import { address, testAgentNode, testAgentTeamNode, testExecutionTree } from "../../fixtures/current-team-run-fixtures.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from "../../fixtures/current-agent-org-run-fixtures.js";

const STORED_ONLY_MANAGER = { getManagedTeamRun: () => null, listManagedTeamRunIds: () => [] };

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
    const baseTree = withTaskAgent(testExecutionTree({
      rootTeamRunId: "root-team-run",
      rootTeamDefinitionId: "classroom",
      coordinatorAddress: "/writer",
      children: [testAgentNode("/writer", { agentRunId: "writer-run" })],
    }));
    const tree = addTaskExecutionToTree({
      tree: baseTree,
      ownerTeamRunId: "root-team-run",
      execution: projectTaskTeamExecution({
        node: testAgentTeamNode({
          address: "/ReviewSquad",
          coordinatorAddress: "/ReviewSquad/reviewer",
          teamRunId: "review-team-run",
          children: [testAgentNode("/ReviewSquad/reviewer", { agentRunId: "reviewer-run" })],
        }),
        startedAt: "2026-08-15T00:02:00.000Z",
      }),
    });
    await new TeamRunExecutionTreeStore().write(
      layout.getTeamDirPath({ rootTeamRunId: "root-team-run", ancestorTeamRunIds: [] }),
      tree,
    );
  });

  afterEach(async () => {
    resetRootRunPackageReadinessIndex(memoryDir);
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("derives configured and task Agent memory from exact root, physical Team ancestry, and AgentRun IDs", async () => {
    const service = new TeamRunExecutionTreeLocationService({ memoryDir, manager: STORED_ONLY_MANAGER });
    const locations = await service.listAgents({ rootTeamRunId: "root-team-run" });

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
        address: "/writer",
        run: "task-writer-run",
        ancestors: [],
        configured: true,
        memoryDir: path.join(memoryDir, "agent_teams", "root-team-run", "task-writer-run"),
      },
      {
        address: "/ReviewSquad/reviewer",
        run: "reviewer-run",
        ancestors: ["review-team-run"],
        configured: false,
        memoryDir: path.join(memoryDir, "agent_teams", "root-team-run", "review-team-run", "reviewer-run"),
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

  it("reads only the requested root's tree when the team run ID is a stored root (REQ-005)", async () => {
    await new TeamRunExecutionTreeStore().write(
      layout.getTeamDirPath({ rootTeamRunId: "other-root", ancestorTeamRunIds: [] }),
      testExecutionTree({
        rootTeamRunId: "other-root",
        rootTeamDefinitionId: "classroom",
        coordinatorAddress: "/writer",
        children: [testAgentNode("/writer", { agentRunId: "other-writer-run" })],
      }),
    );
    const store = new TeamRunExecutionTreeStore();
    const read = vi.spyOn(store, "read");
    const service = new AgentMemoryLocationService({
      memoryDir,
      locationService: new TeamRunExecutionTreeLocationService({ memoryDir, manager: STORED_ONLY_MANAGER, store }),
    });

    await expect(service.resolveTeamMemberLocation({ teamRunId: "root-team-run", agentRunId: "task-writer-run" }))
      .resolves.toMatchObject({
        kind: "team_member",
        rootTeamRunId: "root-team-run",
        agentRunId: "task-writer-run",
        memoryDir: path.join(memoryDir, "agent_teams", "root-team-run", "task-writer-run"),
      });
    expect(read.mock.calls.map(([, rootTeamRunId]) => rootTeamRunId)).toEqual(["root-team-run"]);
  });

  it("still resolves a nested team run ID by searching every root", async () => {
    const service = new AgentMemoryLocationService({ memoryDir });
    await expect(service.resolveTeamMemberLocation({ teamRunId: "review-team-run", agentRunId: "reviewer-run" }))
      .resolves.toMatchObject({
        rootTeamRunId: "root-team-run",
        ancestorTeamRunIds: ["review-team-run"],
        agentRunId: "reviewer-run",
      });
    await expect(service.resolveTeamMemberLocation({ teamRunId: "unknown-team-run", agentRunId: "reviewer-run" }))
      .resolves.toBeNull();
  });

  it("does not resolve members of a stored root that the package readiness index did not admit", async () => {
    // The fixture root has only a tree file, so the readiness rebuild excludes its incomplete package.
    const readiness = new RootRunPackageReadinessIndex(memoryDir);
    await readiness.rebuild();
    expect(readiness.isAdmitted("agent_team", "root-team-run")).toBe(false);

    const service = new AgentMemoryLocationService({ memoryDir });
    await expect(service.resolveTeamMemberLocation({ teamRunId: "root-team-run", agentRunId: "writer-run" }))
      .resolves.toBeNull();
  });

  it("resolves an AgentOrg member's own run inside the requested org root", async () => {
    const lead = testOrgAgentNode("/delivery/lead", "org-lead-run");
    await new AgentOrgRunExecutionTreeStore().write(layout.getOrgDirPath("org-root"), testAgentOrgExecutionTree({
      orgRunId: "org-root",
      members: [
        testOrgAgentNode("/ceo", "org-ceo-run"),
        testOrgTeamNode({ address: "/delivery", teamRunId: "org-delivery-team", coordinatorAddress: lead.address, members: [lead] }),
      ],
    }));
    const service = new AgentMemoryLocationService({ memoryDir });

    await expect(service.resolveAgentOrgMemberLocation({ orgRunId: "org-root", agentRunId: "org-lead-run" }))
      .resolves.toEqual({
        kind: "agent_org_member",
        orgRunId: "org-root",
        ancestorTeamRunIds: ["org-delivery-team"],
        memberAddress: "/delivery/lead",
        agentRunId: "org-lead-run",
        configuredPlacement: expect.objectContaining({ agentRunId: "org-lead-run" }),
        memoryDir: path.join(memoryDir, "agent_orgs", "org-root", "org-delivery-team", "org-lead-run"),
      });
    await expect(service.resolveAgentOrgMemberLocation({ orgRunId: "org-root", agentRunId: "missing" })).resolves.toBeNull();
    await expect(service.resolveAgentOrgMemberLocation({ orgRunId: "missing-org", agentRunId: "org-ceo-run" })).resolves.toBeNull();
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
