import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { AgentOrgRunExecutionTreeStore } from "../../../src/run-history/store/agent-org-run-execution-tree-store.js";
import { AgentOrgExecutionTreeLocationService } from "../../../src/agent-org-execution/services/agent-org-execution-tree-location-service.js";
import { CollaborationExecutionLocationService } from "../../../src/agent-collaboration/execution/services/collaboration-execution-location-service.js";
import { ContextFileOwnerResolver } from "../../../src/context-files/services/context-file-owner-resolver.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from "../../fixtures/current-agent-org-run-fixtures.js";

const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true }))); });
const createStoredOrg = async (memoryDir: string, orgRunId: string) => {
  const direct = testOrgAgentNode("/shared", `${orgRunId}-direct`);
  const member = testOrgAgentNode("/delivery/lead", `${orgRunId}-lead`);
  const team = testOrgTeamNode({ address: "/delivery", teamRunId: `${orgRunId}-team`, coordinatorAddress: member.address, members: [member] });
  const tree = testAgentOrgExecutionTree({ orgRunId, members: [direct, team] });
  const directory = new AgentMemoryLayout(memoryDir).getOrgDirPath(orgRunId);
  await new AgentOrgRunExecutionTreeStore().write(directory, tree);
  return { direct, member, team, tree };
};

describe("AgentOrg and compound execution locations", () => {
  it("projects truthful direct and mounted-Team memory paths", async () => {
    const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "org-locations-")); directories.push(memoryDir);
    const fixture = await createStoredOrg(memoryDir, "org-one"); const service = new AgentOrgExecutionTreeLocationService({ memoryDir });
    const direct = await service.findAgent({ rootRunId: "org-one", memberAddress: fixture.direct.address });
    expect(direct).toMatchObject({ rootSubjectKind: "agent_org", rootRunId: "org-one", containingTeamRunId: null, ancestorTeamRunIds: [], agentRunId: fixture.direct.agentRunId });
    expect(direct?.memoryDir).toBe(path.join(memoryDir, "agent_orgs", "org-one", fixture.direct.agentRunId));
    const mounted = service.findAgentSync({ rootRunId: "org-one", memberAddress: fixture.member.address });
    expect(mounted).toMatchObject({ containingTeamRunId: fixture.team.teamRunId, ancestorTeamRunIds: [fixture.team.teamRunId], agentRunId: fixture.member.agentRunId });
    expect(mounted?.memoryDir).toBe(path.join(memoryDir, "agent_orgs", "org-one", fixture.team.teamRunId, fixture.member.agentRunId));
    expect(await service.containsRunId(fixture.team.teamRunId)).toBe(true);
  });

  it("uses the explicit Org root when the same address exists in multiple stored Orgs", async () => {
    const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "org-locations-")); directories.push(memoryDir);
    await createStoredOrg(memoryDir, "org-a"); const second = await createStoredOrg(memoryDir, "org-b");
    const orgs = new AgentOrgExecutionTreeLocationService({ memoryDir });
    const teams = { findAgent: vi.fn(async () => null), findAgentSync: vi.fn(() => null), listAgents: vi.fn(async () => []), containsRunId: vi.fn(async () => false) };
    const compound = new CollaborationExecutionLocationService({ teams: teams as never, orgs });
    const resolved = await compound.findAgent({ rootSubjectKind: "agent_org", rootRunId: "org-b", memberAddress: "/shared" });
    expect(resolved).toMatchObject({ rootSubjectKind: "agent_org", rootRunId: "org-b", agentRunId: second.direct.agentRunId });
    expect(teams.findAgent).not.toHaveBeenCalled();
    const owner = await new ContextFileOwnerResolver({ locations: compound }).resolveFinalOwner({ kind: "org_member_final", orgRunId: "org-b", agentRunId: second.direct.agentRunId });
    expect(owner).toMatchObject({ kind: "org_member_final", rootSubjectKind: "agent_org", rootRunId: "org-b", agentRunId: second.direct.agentRunId });
  });

  it("rejects ambiguous cross-family AgentRun identities", async () => {
    const item = { rootTeamRunId: "team-root", ancestorTeamRunIds: [], agentRunId: "duplicate", memberAddress: "/agent", memoryDir: "/team" };
    const org = { rootSubjectKind: "agent_org" as const, rootRunId: "org-root", containingTeamRunId: null, ancestorTeamRunIds: [], agentRunId: "duplicate", memberAddress: "/agent", configuredPlacement: null, memoryDir: "/org", tree: {} as never, isActive: false };
    const service = new CollaborationExecutionLocationService({
      teams: { findAgent: async () => item as never, findAgentSync: () => item as never, listAgents: async () => [item as never], containsRunId: async () => true },
      orgs: { findAgent: async () => org, findAgentSync: () => org, listAgents: async () => [org], containsRunId: async () => true },
    });
    await expect(service.findAgent({ agentRunId: "duplicate" })).rejects.toThrow("ambiguous across collaboration root families");
    await expect(service.listAgents()).rejects.toThrow("more than one collaboration root");
    await expect(service.containsRunId("duplicate")).rejects.toThrow("both collaboration root families");
  });
});
