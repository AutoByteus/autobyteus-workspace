import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentMemoryLocationService } from "../../../src/agent-memory/services/agent-memory-location-service.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { TeamRunExecutionTreeStore } from "../../../src/run-history/store/team-run-execution-tree-store.js";
import { TeamRunExecutionTreeLocationService } from "../../../src/run-history/services/team-run-execution-tree-location-service.js";
import { RootRunPackageReadinessIndex, resetRootRunPackageReadinessIndex } from "../../../src/run-history/services/root-run-package-readiness-index.js";
import { writeStoredOrgContainer } from "../../helpers/stored-org-container.js";
import { testAgentNode, testExecutionTree, writeCurrentTeamRunPackage } from "../../fixtures/current-team-run-fixtures.js";

const STORED_ONLY_MANAGER = { getManagedTeamRun: () => null, listManagedTeamRunIds: () => [] };

describe("AgentMemoryLocationService current V1 tree", () => {
  let memoryDir: string;
  let layout: AgentMemoryLayout;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-memory-location-current-"));
    layout = new AgentMemoryLayout(memoryDir);
    // A team run and a team run one of its members delegated to: each is its own root (autobyteus-461).
    const tree = testExecutionTree({
      rootTeamRunId: "root-team-run",
      rootTeamDefinitionId: "classroom",
      coordinatorAddress: "/writer",
      children: [testAgentNode("/writer", { agentRunId: "writer-run" }), testAgentNode("/editor", { agentRunId: "editor-run" })],
    });
    await writeCurrentTeamRunPackage(layout.getTeamDirPath({ rootTeamRunId: "review-team-run", ancestorTeamRunIds: [] }), testExecutionTree({
      rootTeamRunId: "review-team-run", coordinatorAddress: "/reviewer", children: [testAgentNode("/reviewer", { agentRunId: "reviewer-run" })],
    }));
    await writeCurrentTeamRunPackage(
      layout.getTeamDirPath({ rootTeamRunId: "root-team-run", ancestorTeamRunIds: [] }),
      tree,
    );
  });

  afterEach(async () => {
    resetRootRunPackageReadinessIndex(memoryDir);
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("derives each member's memory from its own root and AgentRun ID", async () => {
    const service = new TeamRunExecutionTreeLocationService({ memoryDir, manager: STORED_ONLY_MANAGER });
    expect((await service.listAgents({ rootTeamRunId: "root-team-run" })).map((item) => ({
      address: item.memberAddress, run: item.agentRunId, ancestors: item.ancestorTeamRunIds, memoryDir: item.memoryDir,
    }))).toEqual([
      { address: "/writer", run: "writer-run", ancestors: [], memoryDir: path.join(memoryDir, "agent_teams", "root-team-run", "writer-run") },
      { address: "/editor", run: "editor-run", ancestors: [], memoryDir: path.join(memoryDir, "agent_teams", "root-team-run", "editor-run") },
    ]);
  });

  it("resolves only one exact current address/run match", async () => {
    const service = new AgentMemoryLocationService({ memoryDir });
    await expect(service.resolveTeamMemberLocation({ teamRunId: "root-team-run", memberAddress: "/editor", agentRunId: "editor-run" }))
      .resolves.toMatchObject({ memberAddress: "/editor", agentRunId: "editor-run", ancestorTeamRunIds: [] });
    await expect(service.resolveTeamMemberLocation({ teamRunId: "root-team-run", memberAddress: "/writer", agentRunId: "missing" }))
      .resolves.toBeNull();
  });

  it("reads only the requested root's tree when the team run ID is a stored root (REQ-005)", async () => {
    const store = new TeamRunExecutionTreeStore();
    const read = vi.spyOn(store, "read");
    const service = new AgentMemoryLocationService({
      memoryDir,
      locationService: new TeamRunExecutionTreeLocationService({ memoryDir, manager: STORED_ONLY_MANAGER, store }),
    });
    await expect(service.resolveTeamMemberLocation({ teamRunId: "root-team-run", agentRunId: "writer-run" }))
      .resolves.toMatchObject({ kind: "team_member", rootTeamRunId: "root-team-run", agentRunId: "writer-run",
        memoryDir: path.join(memoryDir, "agent_teams", "root-team-run", "writer-run") });
    expect(read.mock.calls.map(([, rootTeamRunId]) => rootTeamRunId)).toEqual(["root-team-run"]);
  });

  it("resolves a delegated team run's member in its own root, never in the delegator's", async () => {
    const service = new AgentMemoryLocationService({ memoryDir });
    await expect(service.resolveTeamMemberLocation({ teamRunId: "review-team-run", agentRunId: "reviewer-run" }))
      .resolves.toMatchObject({ rootTeamRunId: "review-team-run", ancestorTeamRunIds: [], agentRunId: "reviewer-run",
        memoryDir: path.join(memoryDir, "agent_teams", "review-team-run", "reviewer-run") });
    await expect(service.resolveTeamMemberLocation({ teamRunId: "root-team-run", agentRunId: "reviewer-run" })).resolves.toBeNull();
  });

  it("does not resolve members of a stored root that the package readiness index did not admit", async () => {
    // This root has only a tree file, so the readiness rebuild excludes its incomplete package.
    await new TeamRunExecutionTreeStore().write(
      layout.getTeamDirPath({ rootTeamRunId: "incomplete-root", ancestorTeamRunIds: [] }),
      testExecutionTree({
        rootTeamRunId: "incomplete-root",
        rootTeamDefinitionId: "classroom",
        coordinatorAddress: "/writer",
        children: [testAgentNode("/writer", { agentRunId: "incomplete-writer-run" })],
      }),
    );
    const readiness = new RootRunPackageReadinessIndex(memoryDir);
    await readiness.rebuild();
    expect(readiness.isAdmitted("agent_team", "incomplete-root")).toBe(false);
    expect(readiness.isAdmitted("agent_team", "root-team-run")).toBe(true);

    const service = new AgentMemoryLocationService({ memoryDir });
    await expect(service.resolveTeamMemberLocation({ teamRunId: "incomplete-root", agentRunId: "incomplete-writer-run" }))
      .resolves.toBeNull();
  });

  it("resolves an AgentOrg member's own run: an Org container's member in its unit run (org-teams-follow-definition)", async () => {
    await writeStoredOrgContainer(memoryDir, { orgRunId: "org-root", units: [
      { kind: "agent", address: "/ceo", runId: "org-ceo-run" },
      { kind: "agent_team", address: "/delivery", runId: "org-delivery-team", coordinatorAddress: "/lead", members: [{ address: "/lead", agentRunId: "org-lead-run" }] },
    ] });
    await new RootRunPackageReadinessIndex(memoryDir).rebuild();
    const service = new AgentMemoryLocationService({ memoryDir });

    await expect(service.resolveAgentOrgMemberLocation({ orgRunId: "org-root", agentRunId: "org-lead-run" }))
      .resolves.toEqual({
        kind: "agent_org_member",
        orgRunId: "org-root",
        ancestorTeamRunIds: ["org-delivery-team"],
        memberAddress: "/delivery/lead",
        agentRunId: "org-lead-run",
        configuredPlacement: expect.objectContaining({ agentRunId: "org-lead-run" }),
        memoryDir: path.join(memoryDir, "agent_teams", "org-delivery-team", "org-lead-run"),
      });
    await expect(service.resolveAgentOrgMemberLocation({ orgRunId: "org-root", agentRunId: "missing" })).resolves.toBeNull();
    await expect(service.resolveAgentOrgMemberLocation({ orgRunId: "missing-org", agentRunId: "org-ceo-run" })).resolves.toBeNull();
  });

  it("places a standalone run's memory in its own run folder", () => {
    const service = new AgentMemoryLocationService({ memoryDir });
    expect(service.getStandaloneLocation({ agentRunId: "standalone-run" })).toEqual({
      kind: "standalone",
      agentRunId: "standalone-run",
      memoryDir: path.join(memoryDir, "agents", "standalone-run"),
    });
  });
});
