import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { AgentOrgContainerStore } from "../../../src/run-history/store/agent-org-container-store.js";
import { writeStoredOrgContainer } from "../../helpers/stored-org-container.js";
import { AgentOrgExecutionTreeLocationService } from "../../../src/agent-org-execution/services/agent-org-execution-tree-location-service.js";
import { CollaborationExecutionLocationService } from "../../../src/agent-collaboration/execution/services/collaboration-execution-location-service.js";
import { ContextFileOwnerResolver } from "../../../src/context-files/services/context-file-owner-resolver.js";
import { RootRunPackageReadinessIndex, resetRootRunPackageReadinessIndex } from "../../../src/run-history/services/root-run-package-readiness-index.js";

const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true }))); });
/** An Org container (org-teams-follow-definition): a direct agent `/shared` and the Team unit `/delivery` with its `/lead`. */
const createStoredOrg = async (memoryDir: string, orgRunId: string) => {
  const direct = { address: "/shared", agentRunId: `${orgRunId}-direct` };
  const member = { address: "/delivery/lead", agentRunId: `${orgRunId}-lead` };
  const team = { address: "/delivery", teamRunId: `${orgRunId}-team` };
  await writeStoredOrgContainer(memoryDir, { orgRunId, units: [{ kind: "agent", address: direct.address, runId: direct.agentRunId },
    { kind: "agent_team", address: team.address, runId: team.teamRunId, coordinatorAddress: "/lead", members: [{ address: "/lead", agentRunId: member.agentRunId }] }] });
  return { direct, member, team };
};

describe("AgentOrg and compound execution locations", () => {
  it("projects truthful direct and mounted-Team memory paths", async () => {
    const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "org-locations-")); directories.push(memoryDir);
    const fixture = await createStoredOrg(memoryDir, "org-one"); const service = new AgentOrgExecutionTreeLocationService({ memoryDir });
    const direct = await service.findAgent({ rootRunId: "org-one", memberAddress: fixture.direct.address });
    expect(direct).toMatchObject({ rootSubjectKind: "agent_org", rootRunId: "org-one", containingTeamRunId: null, ancestorTeamRunIds: [], agentRunId: fixture.direct.agentRunId });
    // A unit's agent lives in its unit run: a direct agent in its own run, a Team unit member in its Team run.
    expect(direct?.memoryDir).toBe(path.join(memoryDir, "agents", fixture.direct.agentRunId));
    const mounted = service.findAgentSync({ rootRunId: "org-one", memberAddress: fixture.member.address });
    expect(mounted).toMatchObject({ containingTeamRunId: fixture.team.teamRunId, ancestorTeamRunIds: [fixture.team.teamRunId], agentRunId: fixture.member.agentRunId });
    expect(mounted?.memoryDir).toBe(path.join(memoryDir, "agent_teams", fixture.team.teamRunId, fixture.member.agentRunId));
  });

  it("uses the explicit Org root when the same address exists in multiple stored Orgs", async () => {
    const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "org-locations-")); directories.push(memoryDir);
    await createStoredOrg(memoryDir, "org-a"); const second = await createStoredOrg(memoryDir, "org-b");
    const orgs = new AgentOrgExecutionTreeLocationService({ memoryDir });
    const teams = { findAgent: vi.fn(async () => null), findAgentSync: vi.fn(() => null), listAgents: vi.fn(async () => []) };
    const compound = new CollaborationExecutionLocationService({ teams: teams as never, orgs });
    const resolved = await compound.findAgent({ rootSubjectKind: "agent_org", rootRunId: "org-b", memberAddress: "/shared" });
    expect(resolved).toMatchObject({ rootSubjectKind: "agent_org", rootRunId: "org-b", agentRunId: second.direct.agentRunId });
    expect(teams.findAgent).not.toHaveBeenCalled();
    const owner = await new ContextFileOwnerResolver({ memoryDir, locations: compound }).resolveFinalOwner({ kind: "org_member_final", orgRunId: "org-b", agentRunId: second.direct.agentRunId });
    expect(owner).toMatchObject({ kind: "org_member_final", rootSubjectKind: "agent_org", rootRunId: "org-b", agentRunId: second.direct.agentRunId });
  });

  it("lists one requested root's Agent executions from a single tree read and exposes sorted root IDs", async () => {
    const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "org-locations-")); directories.push(memoryDir);
    const second = await createStoredOrg(memoryDir, "org-b"); await createStoredOrg(memoryDir, "org-a");
    const read = vi.spyOn(AgentOrgContainerStore.prototype, "readIfContainer");
    const service = new AgentOrgExecutionTreeLocationService({ memoryDir });

    expect(await service.listRootRunIds()).toEqual(["org-a", "org-b"]);
    const scoped = await service.listAgents({ rootRunId: "org-b" });
    expect(read.mock.calls.map(([, orgRunId]) => orgRunId)).toEqual(["org-b"]);
    expect(scoped.map((item) => ({ root: item.rootRunId, run: item.agentRunId, configured: item.configuredPlacement !== null }))).toEqual([
      { root: "org-b", run: second.direct.agentRunId, configured: true },
      { root: "org-b", run: second.member.agentRunId, configured: true },
    ]);
    expect(await service.listAgents({ rootRunId: "missing" })).toEqual([]);
    expect((await service.listAgents()).map((item) => item.rootRunId)).toEqual(["org-a", "org-a", "org-b", "org-b"]);
  });

  it("respects root-package admission for a root-scoped listing", async () => {
    const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "org-locations-")); directories.push(memoryDir);
    await createStoredOrg(memoryDir, "org-a");
    // A unit that no longer names its Org back: the container is not a current package.
    await fs.rm(path.join(memoryDir, "agents", "org-a-direct"), { recursive: true, force: true });
    const readiness = new RootRunPackageReadinessIndex(memoryDir);
    await readiness.rebuild();
    try {
      // A unit reference is broken, so the readiness rebuild excludes the incomplete package.
      expect(readiness.isAdmitted("agent_org", "org-a")).toBe(false);
      const service = new AgentOrgExecutionTreeLocationService({ memoryDir });
      expect(await service.listAgents({ rootRunId: "org-a" })).toEqual([]);
      expect(await service.listRootRunIds()).toEqual([]);
    } finally {
      resetRootRunPackageReadinessIndex(memoryDir);
    }
  });

  it("rejects ambiguous cross-family AgentRun identities", async () => {
    const item = { rootTeamRunId: "team-root", ancestorTeamRunIds: [], agentRunId: "duplicate", memberAddress: "/agent", memoryDir: "/team" };
    const org = { rootSubjectKind: "agent_org" as const, rootRunId: "org-root", containingTeamRunId: null, ancestorTeamRunIds: [], agentRunId: "duplicate", memberAddress: "/agent", configuredPlacement: null, memoryDir: "/org", tree: {} as never, isActive: false };
    const service = new CollaborationExecutionLocationService({
      teams: { findAgent: async () => item as never, findAgentSync: () => item as never, listAgents: async () => [item as never] },
      orgs: { findAgent: async () => org, findAgentSync: () => org, listAgents: async () => [org] },
      agents: { findAgent: async () => null, findAgentSync: () => null, listAgents: async () => [] },
    });
    await expect(service.findAgent({ agentRunId: "duplicate" })).rejects.toThrow("ambiguous across collaboration root families");
    await expect(service.listAgents()).rejects.toThrow("more than one collaboration root");
  });
});
