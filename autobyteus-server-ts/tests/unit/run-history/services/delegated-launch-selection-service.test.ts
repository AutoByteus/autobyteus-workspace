import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { describe, expect, it, vi } from "vitest";
import { DelegatedLaunchSelectionService } from "../../../../src/run-history/services/delegated-launch-selection-service.js";

/** DS-001 / DS-002 / AR-004: the service only finds the root and routes; it never edits trees itself. */
const choice = { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "bigger", llmConfig: null };
const changes = [{ agentRunId: "copy", selection: choice }];
const saved = { outcome: "UPDATED" as const, message: "Saved.", fieldErrors: [] };

const build = (live: { team?: unknown; org?: unknown; agent?: unknown } = {}) => {
  const teams = {
    getManagedTeamRun: vi.fn(() => live.team ?? null),
    updateStoppedRunLaunchChanges: vi.fn(async () => ({ success: true, ...saved })),
    delegatedLaunchModelOptions: vi.fn(async () => []),
  };
  const orgs = {
    getActive: vi.fn(() => live.org ?? null),
    updateStoppedRunConfig: vi.fn(async () => ({ success: true, ...saved })),
    delegatedLaunchModelOptions: vi.fn(async () => []),
  };
  const agents = {
    getActive: vi.fn(() => live.agent ?? null),
    hasRoot: vi.fn(() => false),
    updateStoppedDelegatedLaunchSelections: vi.fn(async () => ({ result: saved, tree: null })),
    delegatedLaunchModelOptions: vi.fn(async () => []),
  };
  const agentRuns = { updateStoppedSelection: vi.fn(async () => ({ success: true, outcome: "UPDATED", message: "ok", fieldErrors: [] })) };
  const validator = { validate: vi.fn(), validateMany: vi.fn(), listOptionsMany: vi.fn() };
  const service = new DelegatedLaunchSelectionService({ teams, orgs, agents, agentRuns, validator } as never);
  return { service, teams, orgs, agents, agentRuns, validator };
};

describe("DelegatedLaunchSelectionService", () => {
  it("routes a live root's Stop to the root; a live run has no copies to change (autobyteus-461: a delegated run is configured as itself)", async () => {
    const root = { stopDelegatedExecution: vi.fn(async () => ({ outcome: "STOPPED", message: "Stopped.", notStoppedUnattributed: 1 })) };
    const f = build({ team: root });
    await expect(f.service.stop({ rootKind: "AGENT_TEAM", rootRunId: "root", target: { teamRunId: "copy" } }))
      .resolves.toEqual({ success: true, outcome: "STOPPED", message: "Stopped.", notStoppedUnattributed: 1 });
    await expect(f.service.update({ rootKind: "AGENT_TEAM", rootRunId: "root", changes })).resolves.toMatchObject({ success: false, outcome: "NOT_FOUND" });
    await expect(f.service.update({ rootKind: "AGENT_TEAM", rootRunId: "root", changes,
      configured: { kind: "team", patches: [{ scopeKind: "CONFIGURED_AGENT", scopeAddress: "/a", runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "x", llmConfig: null }] } }))
      .resolves.toMatchObject({ success: false, outcome: "RUN_ACTIVE" });
    expect(f.teams.updateStoppedRunLaunchChanges).not.toHaveBeenCalled();
  });

  it("reports a stopped root's Stop as not active and routes its Save to the manager with its own settings", async () => {
    const f = build();
    await expect(f.service.stop({ rootKind: "AGENT_ORG", rootRunId: "org", target: { agentRunId: "copy" } }))
      .resolves.toMatchObject({ success: false, outcome: "ROOT_NOT_ACTIVE" });
    const patches = [{ scopeKind: "CONFIGURED_AGENT" as const, scopeAddress: "/w", runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "x", llmConfig: null }];
    await f.service.update({ rootKind: "AGENT_ORG", rootRunId: "org", changes, configured: { kind: "org", patches } });
    expect(f.orgs.updateStoppedRunConfig).toHaveBeenCalledWith({ orgRunId: "org", selectionPatches: patches, teamWorkspacePatches: [], delegatedChanges: changes });
    await f.service.update({ rootKind: "AGENT_TEAM", rootRunId: "root", changes });
    expect(f.teams.updateStoppedRunLaunchChanges).toHaveBeenCalledWith({ teamRunId: "root", configuredPatches: [], delegatedChanges: changes });
  });

  it("saves a stopped Agent run's own model; it has no copies to change; a failure is reported", async () => {
    const f = build();
    const host = { kind: "agent" as const, selection: choice };
    await expect(f.service.update({ rootKind: "AGENT", rootRunId: "host", changes: [], configured: host })).resolves.toMatchObject({ outcome: "UPDATED" });
    expect(f.agentRuns.updateStoppedSelection).toHaveBeenCalledWith({ agentRunId: "host", ...choice });
    await expect(f.service.update({ rootKind: "AGENT", rootRunId: "host", changes, configured: host })).resolves.toMatchObject({ success: false, outcome: "NOT_FOUND" });
    f.agentRuns.updateStoppedSelection.mockResolvedValueOnce({ success: false, outcome: "PERSISTENCE_FAILED", message: "disk", fieldErrors: [] });
    await expect(f.service.update({ rootKind: "AGENT", rootRunId: "host", changes: [], configured: host }))
      .resolves.toMatchObject({ success: false, outcome: "PERSISTENCE_FAILED", message: "disk" });
  });

  it("refuses the run's own settings of another root kind", async () => {
    const f = build();
    await expect(f.service.update({ rootKind: "AGENT_TEAM", rootRunId: "root", changes, configured: { kind: "agent", selection: choice } }))
      .resolves.toMatchObject({ outcome: "VALIDATION_FAILED" });
  });
});
