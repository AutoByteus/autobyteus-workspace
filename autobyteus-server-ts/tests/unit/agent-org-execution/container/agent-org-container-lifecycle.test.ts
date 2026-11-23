import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentOrgDefinition, AgentOrgMember } from "../../../../src/agent-org-definition/domain/agent-org-definition.js";
import { AgentTeamDefinition, TeamMember } from "../../../../src/agent-team-definition/domain/agent-team-definition.js";
import { AgentOrgRunPlanner } from "../../../../src/agent-org-execution/services/agent-org-run-planner.js";
import { planAgentOrgContainer } from "../../../../src/agent-org-execution/container/agent-org-container-plan.js";
import { AgentOrgContainerManager } from "../../../../src/agent-org-execution/container/agent-org-container-manager.js";
import type { AgentOrgUnitRuns } from "../../../../src/agent-org-execution/container/agent-org-unit-runs.js";
import { AgentOrgContainerStore } from "../../../../src/run-history/store/agent-org-container-store.js";
import { AgentMemoryLayout } from "../../../../src/agent-memory/store/agent-memory-layout.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

/** DS-001, DS-003: an Org container makes its units runs of their own, keeps the Org rules, stops and reopens. */
const launch = { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "model", llmConfig: null, autoExecuteTools: true, workspaceRootPath: "/w" };
const org = new AgentOrgDefinition({
  id: "sdd", name: "Software Development Department", description: "", instructions: "",
  members: [
    new AgentOrgMember({ memberName: "concierge", ref: "concierge", refType: "agent", refScope: "shared" }),
    new AgentOrgMember({ memberName: "software_engineering_team", ref: "set", refType: "agent_team", refScope: "shared" }),
  ],
  handoffs: [
    { from: "/concierge", to: "/software_engineering_team", rules: ["When a software request arrives."] },
    { from: "/software_engineering_team/lead", to: "/concierge", rules: ["When done."] },
  ],
});
const team = new AgentTeamDefinition({
  id: "set", name: "Software Engineering Team", description: "", instructions: "", coordinatorMemberName: "lead",
  nodes: ["lead", "reviewer"].map((name) => new TeamMember({ memberName: name, ref: name, refScope: "shared" })),
  handoffs: [{ from: "/lead", to: "/reviewer", rules: ["When the design is ready."] }],
});
const resolved = () => new AgentOrgRunPlanner({ getAgentById: async (id) => ({ id }) as never, getTeamById: async () => team }, {
  allocateAgent: async (id) => `${id}-x`, allocateTeam: () => "team-x", allocateOrg: () => "org-x",
}).resolveConfiguration({ definition: org, rootConfiguration: launch });

const dirs: string[] = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))); });

const fakeUnits = (failAt?: string) => {
  const created: string[] = [];
  const units = {
    createTeamUnit: vi.fn(async (unit, context) => { if (unit.address === failAt) throw new Error("no team"); created.push(unit.address); return `${unit.teamDefinitionId}_run`; }),
    createAgentUnit: vi.fn(async (unit, context) => { if (unit.address === failAt) throw new Error("no agent"); created.push(unit.address); return `${unit.agentDefinitionId}_run`; }),
    stopUnit: vi.fn(async () => true),
    discardUnit: vi.fn(async () => undefined),
  } satisfies AgentOrgUnitRuns;
  return { units, created };
};

describe("planAgentOrgContainer (DS-001)", () => {
  it("makes each mounted Team a Team unit with its members in team space, each direct agent an agent unit, and keeps only the Org-level rules", async () => {
    const { topology, launch: resolvedLaunch } = await resolved();
    const plan = planAgentOrgContainer({ topology, launch: resolvedLaunch });
    expect(plan.units).toEqual([
      { kind: "agent", address: "/concierge", agentDefinitionId: "concierge", launchConfiguration: launch },
      { kind: "agent_team", address: "/software_engineering_team", teamDefinitionId: "set", defaultLaunchConfiguration: launch, members: [
        { address: "/lead", agentDefinitionId: "lead", launchConfiguration: launch },
        { address: "/reviewer", agentDefinitionId: "reviewer", launchConfiguration: launch }] },
    ]);
    // The Team's own rule (lead → reviewer) stays with its Team run; the Org rules stay with the container.
    expect(plan.orgRules).toEqual([
      { from: "/concierge", to: "/software_engineering_team", rules: ["When a software request arrives."] },
      { from: "/software_engineering_team/lead", to: "/concierge", rules: ["When done."] },
    ]);
  });
});

describe("AgentOrgContainerManager (DS-001, DS-003)", () => {
  const setup = async (failAt?: string) => {
    const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "org-container-"));
    dirs.push(memoryDir);
    const { topology, launch: resolvedLaunch } = await resolved();
    const fake = fakeUnits(failAt);
    const manager = new AgentOrgContainerManager({ memoryDir, units: fake.units });
    const create = () => manager.create({ orgRunId: "org_1", orgDefinitionId: "sdd", orgDefinitionName: "Software Development Department",
      defaultLaunchConfiguration: launch, applicationBinding: null, plan: planAgentOrgContainer({ topology, launch: resolvedLaunch }), createdAt: "2026-11-22T00:00:00.000Z" });
    return { memoryDir, manager, create, ...fake };
  };

  it("creates every unit with containedIn, then writes the container file listing them", async () => {
    const { manager, create, units, memoryDir } = await setup();
    const container = await create();
    expect(units.createAgentUnit).toHaveBeenCalledWith(expect.anything(), { containedIn: { orgRunId: "org_1", address: "/concierge" }, applicationBinding: null });
    expect(units.createTeamUnit).toHaveBeenCalledWith(expect.anything(), { containedIn: { orgRunId: "org_1", address: "/software_engineering_team" }, applicationBinding: null });
    const stored = await new AgentOrgContainerStore().read(new AgentMemoryLayout(memoryDir).getOrgDirPath("org_1"), "org_1");
    expect(stored?.rootOrg.units).toEqual([
      { address: "/concierge", kind: "agent", runId: "concierge_run", definitionId: "concierge" },
      { address: "/software_engineering_team", kind: "agent_team", runId: "set_run", definitionId: "set" },
    ]);
    expect(stored?.rootOrg.formerUnits).toEqual([]);
    expect(stored?.handoffs).toHaveLength(2);
    expect(container.unitAt("/software_engineering_team/lead")?.runId).toBe("set_run");
    expect(container.unitAt("/concierge")?.runId).toBe("concierge_run");
    expect(manager.getLive("org_1")).toBe(container);
    await expect(create()).rejects.toThrow("already exists");
  });

  it("discards the units made so far when a unit cannot be created, and writes no container", async () => {
    const { create, units, manager } = await setup("/software_engineering_team");
    await expect(create()).rejects.toThrow("no team");
    expect(units.discardUnit).toHaveBeenCalledWith({ address: "/concierge", kind: "agent", runId: "concierge_run", definitionId: "concierge" });
    expect(await manager.isStored("org_1")).toBe(false);
  });

  it("Stop stops every unit run; a unit that does not stop keeps the Org live for a retry; reopen reads the file and restores no unit", async () => {
    const { manager, create, units } = await setup();
    await create();
    units.stopUnit.mockResolvedValueOnce(false);
    expect(await manager.stop("org_1")).toBe(false);
    expect(manager.getLive("org_1")).not.toBeNull();
    expect(await manager.stop("org_1")).toBe(true);
    expect(units.stopUnit).toHaveBeenCalledTimes(4);
    expect(manager.getLive("org_1")).toBeNull();
    const reopened = await manager.restore("org_1");
    expect(reopened.listUnits().map((unit) => unit.runId)).toEqual(["concierge_run", "set_run"]);
    expect(units.createAgentUnit).toHaveBeenCalledTimes(1);
  });
});
