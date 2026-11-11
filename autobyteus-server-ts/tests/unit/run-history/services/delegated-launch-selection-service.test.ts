import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { describe, expect, it, vi } from "vitest";
import { DelegatedLaunchSelectionService } from "../../../../src/run-history/services/delegated-launch-selection-service.js";

/**
 * AR-004 / SR-039: the delegator's own settings in the same Save, checked first, then saved by its own ordinary
 * stopped-run save. The routing of child rows is in `delegated-child-launches.test.ts`.
 */
const choice = { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "bigger", llmConfig: null };
const ok = { success: true, outcome: "UPDATED" as const, message: "Saved.", fieldErrors: [] };
const teamPatches = [{ scopeKind: "CONFIGURED_AGENT" as const, scopeAddress: "/a", runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "x", llmConfig: null }];

const build = (live: { team?: unknown; org?: unknown; agent?: unknown } = {}) => {
  const teams = { getManagedTeamRun: vi.fn(() => live.team ?? null), checkStoppedSelections: vi.fn(async () => null), updateStoppedSelections: vi.fn(async () => ok) };
  const orgs = { getActive: vi.fn(() => live.org ?? null), checkStoppedRunConfig: vi.fn(async () => null), updateStoppedRunConfig: vi.fn(async () => ok) };
  const agents = { getActive: vi.fn(() => live.agent ?? null) };
  const agentRuns = { checkStoppedSelection: vi.fn(async () => null), updateStoppedSelection: vi.fn(async () => ok), terminateAgentRun: vi.fn() };
  const children = { plan: vi.fn(async () => ({ kind: "planned", saves: [] })), apply: vi.fn(async () => ({ ok: true, changed: false })),
    modelOptions: vi.fn(async () => []), localChild: vi.fn(() => null) };
  const service = new DelegatedLaunchSelectionService({ teams, orgs, agents, agentRuns, teamRuns: { terminateTeamRun: vi.fn() }, children } as never);
  return { service, teams, orgs, agentRuns, children };
};

describe("DelegatedLaunchSelectionService: the delegator's own settings", () => {
  it("refuses the run's own settings while it runs; its stopped children may still change", async () => {
    const f = build({ team: {} });
    await expect(f.service.update({ rootKind: "AGENT_TEAM", rootRunId: "root", changes: [], configured: { kind: "team", patches: teamPatches } }))
      .resolves.toMatchObject({ success: false, outcome: "RUN_ACTIVE" });
    expect(f.teams.updateStoppedSelections).not.toHaveBeenCalled();
    await expect(f.service.update({ rootKind: "AGENT_TEAM", rootRunId: "root", changes: [] })).resolves.toMatchObject({ success: true, outcome: "UNCHANGED" });
    expect(f.children.plan).toHaveBeenCalled();
  });

  it("checks then saves a stopped Team's and Org's own settings through their own saves", async () => {
    const f = build();
    await expect(f.service.update({ rootKind: "AGENT_TEAM", rootRunId: "root", changes: [], configured: { kind: "team", patches: teamPatches } }))
      .resolves.toMatchObject({ outcome: "UPDATED" });
    expect(f.teams.checkStoppedSelections).toHaveBeenCalledWith({ teamRunId: "root", selectionPatches: teamPatches });
    expect(f.teams.updateStoppedSelections).toHaveBeenCalledWith({ teamRunId: "root", selectionPatches: teamPatches });
    await f.service.update({ rootKind: "AGENT_ORG", rootRunId: "org", changes: [], configured: { kind: "org", patches: teamPatches } });
    expect(f.orgs.updateStoppedRunConfig).toHaveBeenCalledWith({ orgRunId: "org", selectionPatches: teamPatches, teamWorkspacePatches: [] });
  });

  it("saves a stopped Agent run's own model; a refused check or a failed save is reported and nothing else is written", async () => {
    const f = build();
    const host = { kind: "agent" as const, selection: choice };
    await expect(f.service.update({ rootKind: "AGENT", rootRunId: "host", changes: [], configured: host })).resolves.toMatchObject({ outcome: "UPDATED" });
    expect(f.agentRuns.updateStoppedSelection).toHaveBeenCalledWith({ agentRunId: "host", ...choice });
    f.agentRuns.checkStoppedSelection.mockResolvedValueOnce({ success: false, outcome: "VALIDATION_FAILED", message: "bad", fieldErrors: [] } as never);
    await expect(f.service.update({ rootKind: "AGENT", rootRunId: "host", changes: [], configured: host }))
      .resolves.toMatchObject({ success: false, outcome: "VALIDATION_FAILED", message: "bad" });
    expect(f.children.apply).toHaveBeenCalledTimes(1);
    f.agentRuns.updateStoppedSelection.mockResolvedValueOnce({ success: false, outcome: "PERSISTENCE_FAILED", message: "disk", fieldErrors: [] } as never);
    await expect(f.service.update({ rootKind: "AGENT", rootRunId: "host", changes: [], configured: host }))
      .resolves.toMatchObject({ success: false, outcome: "PERSISTENCE_FAILED", message: "disk" });
    expect(f.children.apply).toHaveBeenCalledTimes(1);
  });

  it("refuses the run's own settings of another root kind", async () => {
    const f = build();
    await expect(f.service.update({ rootKind: "AGENT_TEAM", rootRunId: "root", changes: [], configured: { kind: "agent", selection: choice } }))
      .resolves.toMatchObject({ outcome: "VALIDATION_FAILED" });
  });
});
