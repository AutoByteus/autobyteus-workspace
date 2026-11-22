import { describe, expect, it, vi } from "vitest";
import { createAgentOrgUnitRuns } from "../../../../src/agent-org-execution/container/agent-org-unit-runs.js";

/** DS-001, contract §3, §4, §11: a unit is an ordinary run created by its own service, with containedIn and the Org's ownership. */
const launch = { runtimeKind: "codex_app_server", llmModelIdentifier: "model", llmConfig: { effort: "low" }, autoExecuteTools: true, workspaceRootPath: "/w" } as never;
const services = () => ({
  teamRuns: { createTeamRun: vi.fn(async () => ({ teamRunId: "set_1" })), terminateTeamRun: vi.fn(async () => true), getManagedTeamRun: vi.fn(() => null as never) },
  agentRuns: { prepareAgentRun: vi.fn(async () => ({ runId: "concierge_1" })), terminateAgentRun: vi.fn(async () => ({ success: false, route: "not_found" })),
    cancelPreparedAgentRun: vi.fn(async () => ({ success: true, message: "" })) },
  teamHistory: { deleteStoredTeamRun: vi.fn(async () => ({ success: true, message: "" })) },
});
const binding = { applicationId: "app", bindingId: "binding" };

describe("createAgentOrgUnitRuns", () => {
  it("creates a Team unit in team space with containedIn and the Org's application binding", async () => {
    const s = services();
    const units = createAgentOrgUnitRuns(s as never);
    expect(await units.createTeamUnit({ kind: "agent_team", address: "/set" as never, teamDefinitionId: "set", defaultLaunchConfiguration: launch,
      members: [{ address: "/lead" as never, agentDefinitionId: "lead", launchConfiguration: launch }] }, { containedIn: { orgRunId: "org_1", address: "/set" as never }, applicationBinding: binding })).toBe("set_1");
    expect(s.teamRuns.createTeamRun).toHaveBeenCalledWith(expect.objectContaining({
      teamDefinitionId: "set", containedIn: { orgRunId: "org_1", address: "/set" }, applicationBinding: binding,
      teamConfigs: [expect.objectContaining({ teamAddress: "/", llmModelIdentifier: "model" })],
      memberConfigs: [expect.objectContaining({ memberAddress: "/lead", agentDefinitionId: "lead", llmConfig: { effort: "low" } })],
    }));
    expect((s.teamRuns.createTeamRun.mock.calls[0] as unknown[])[0]).not.toHaveProperty("delegatedFrom");
  });

  it("prepares an agent unit at its Org address with containedIn; an application's Org gives it the agent's application context", async () => {
    const s = services();
    const units = createAgentOrgUnitRuns(s as never);
    await units.createAgentUnit({ kind: "agent", address: "/concierge" as never, agentDefinitionId: "concierge", launchConfiguration: launch },
      { containedIn: { orgRunId: "org_1", address: "/concierge" as never }, applicationBinding: binding });
    expect(s.agentRuns.prepareAgentRun).toHaveBeenCalledWith(expect.objectContaining({ agentDefinitionId: "concierge", address: "/concierge",
      containedIn: { orgRunId: "org_1", address: "/concierge" }, applicationBinding: { ...binding, displayName: "concierge" }, workspaceRootPath: "/w" }));
    await units.createAgentUnit({ kind: "agent", address: "/concierge" as never, agentDefinitionId: "concierge", launchConfiguration: launch },
      { containedIn: { orgRunId: "org_1", address: "/concierge" as never }, applicationBinding: null });
    expect(s.agentRuns.prepareAgentRun).toHaveBeenLastCalledWith(expect.objectContaining({ applicationBinding: null }));
  });

  it("a unit that is not running counts as stopped; discard removes a made unit through its own service", async () => {
    const s = services();
    const units = createAgentOrgUnitRuns(s as never);
    expect(await units.stopUnit({ address: "/set" as never, kind: "agent_team", runId: "set_1", definitionId: "set" })).toBe(true);
    expect(s.teamRuns.terminateTeamRun).not.toHaveBeenCalled();
    expect(await units.stopUnit({ address: "/concierge" as never, kind: "agent", runId: "concierge_1", definitionId: "concierge" })).toBe(true);
    await units.discardUnit({ address: "/set" as never, kind: "agent_team", runId: "set_1", definitionId: "set" });
    expect(s.teamHistory.deleteStoredTeamRun).toHaveBeenCalledWith("set_1");
    await units.discardUnit({ address: "/concierge" as never, kind: "agent", runId: "concierge_1", definitionId: "concierge" });
    expect(s.agentRuns.cancelPreparedAgentRun).toHaveBeenCalledWith("concierge_1");
  });
});
