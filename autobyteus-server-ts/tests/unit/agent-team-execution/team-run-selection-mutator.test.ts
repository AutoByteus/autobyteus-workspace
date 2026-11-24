import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { describe, expect, it } from 'vitest';
import {
  applyTeamRunSelectionPatches,
  resolveTeamRunSelectionTargets,
  type TeamRunSelectionTarget,
} from '../../../src/agent-team-execution/services/team-run-selection-mutator.js';

/**
 * These tests apply the rule directly, below `planStoppedTeamLaunchSave`'s real continuation decision (autobyteus-53
 * REQ-003); each CONFIGURED_AGENT target states the continuation the decision table would give that case.
 */
const withContinuation = (targets: readonly TeamRunSelectionTarget[], continuation: "same_session" | "hand_over") =>
  targets.map((target) => target.patch.scopeKind === "CONFIGURED_AGENT" ? { ...target, continuation } : target);

const launch = (llmConfig: Record<string, unknown>) => ({
  runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt', llmConfig,
  autoExecuteTools: false, workspaceRootPath: '/workspace',
});
const tree = () => ({
  schemaVersion: 2, createdAt: '2026-08-25T00:00:00.000Z', archivedAt: null, applicationBinding: null, handoffs: [],
  rootTeam: {
    address: '/', teamDefinitionId: 'root-def', teamDefinitionName: 'Root', teamRunId: 'root-run',
    coordinatorAddress: '/agent', defaultLaunchConfiguration: launch({ effort: 'medium' }), taskExecutions: [],
    members: [{
      address: '/agent', agentDefinitionId: 'agent-def', role: null, description: null,
      agentRunId: 'agent-run', platformAgentRunId: null, launchConfiguration: launch({ effort: 'medium' }),
    }],
  },
} as any);

describe('Team run model-config mutator', () => {
  it('changes only the addressed configured launch configurations', () => {
    const original = tree();
    const targets = resolveTeamRunSelectionTargets(original, [{
      scopeKind: 'CONFIGURED_AGENT', scopeAddress: '/agent', runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: 'target', llmConfig: { effort: 'high' },
    }]);
    const updated = applyTeamRunSelectionPatches(original, withContinuation(targets, 'hand_over'));
    expect(updated.rootTeam.defaultLaunchConfiguration.llmConfig).toEqual({ effort: 'medium' });
    expect((updated.rootTeam.members[0] as any).launchConfiguration.llmConfig).toEqual({ effort: 'high' });
    expect((updated.rootTeam.members[0] as any).launchConfiguration.llmModelIdentifier).toBe('target');
    expect(original.rootTeam.members[0].launchConfiguration.llmConfig).toEqual({ effort: 'medium' });
  });

  it('CR-461-089: a Team-level save changes its default only; a member with no source of its own keeps the Team\'s earlier one as its own', () => {
    const original = tree();
    original.rootTeam.defaultLaunchSource = { origin: 'configured', fallbacks: [] };
    original.rootTeam.members.push({ ...original.rootTeam.members[0], address: '/own', agentRunId: 'own-run',
      launchSource: { origin: 'agent_default', fallbacks: [] } });
    const targets = resolveTeamRunSelectionTargets(original, [{
      scopeKind: 'CONFIGURED_TEAM', scopeAddress: '/', runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: 'team-next', llmConfig: null,
    }]);
    const updated = applyTeamRunSelectionPatches(original, targets) as any;
    expect(updated.rootTeam.defaultLaunchConfiguration.llmModelIdentifier).toBe('team-next');
    expect(updated.rootTeam.defaultLaunchSource).toEqual({ origin: 'settings', fallbacks: [] });
    // Each member's launch is unchanged, and so is where it came from.
    expect(updated.rootTeam.members.map((member: any) => [member.address, member.launchConfiguration.llmModelIdentifier, member.launchSource])).toEqual([
      ['/agent', 'gpt', { origin: 'configured', fallbacks: [] }],
      ['/own', 'gpt', { origin: 'agent_default', fallbacks: [] }],
    ]);
    // A save that leaves the default as it was changes no source.
    const same = applyTeamRunSelectionPatches(original, resolveTeamRunSelectionTargets(original, [{
      scopeKind: 'CONFIGURED_TEAM', scopeAddress: '/', runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: 'gpt', llmConfig: { effort: 'medium' },
    }])) as any;
    expect(same.rootTeam.defaultLaunchSource).toEqual({ origin: 'configured', fallbacks: [] });
    expect(same.rootTeam.members[0].launchSource).toBeUndefined();
  });

  it('rejects duplicate, missing, and kind-mismatched configured targets', () => {
    const original = tree();
    expect(() => resolveTeamRunSelectionTargets(original, [
      { scopeKind: 'CONFIGURED_AGENT', scopeAddress: '/agent', runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: 'target', llmConfig: null },
      { scopeKind: 'CONFIGURED_AGENT', scopeAddress: '/agent', runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: 'target', llmConfig: null },
    ])).toThrow(/Duplicate/);
    expect(() => resolveTeamRunSelectionTargets(original, [
      { scopeKind: 'CONFIGURED_TEAM', scopeAddress: '/agent', runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: 'target', llmConfig: null },
    ])).toThrow(/does not match kind/);
    expect(() => resolveTeamRunSelectionTargets(original, [
      { scopeKind: 'CONFIGURED_AGENT', scopeAddress: '/task-agent', runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: 'target', llmConfig: null },
    ])).toThrow(/was not found/);
  });
});

describe('Team run selection saves with an agent runtime (autobyteus-348, REQ-001, AC-001, AC-003)', () => {
  const save = (original: any, selection: Record<string, unknown>, switchId = 'switch-1', continuation: "same_session" | "hand_over" = 'hand_over') => {
    const targets = resolveTeamRunSelectionTargets(original, [{
      scopeKind: 'CONFIGURED_AGENT', scopeAddress: '/agent', runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: 'opus', llmConfig: null, ...selection,
    } as any]);
    return { targets, tree: applyTeamRunSelectionPatches(original, withContinuation(targets, continuation), () => switchId) };
  };
  const member = (tree: any) => tree.rootTeam.members[0];

  it('another agent runtime switches the member: the new selection, no session, the previous binding remembered; the rest is untouched', () => {
    const original = tree();
    original.rootTeam.members[0].platformAgentRunId = 'thread-1';
    const { tree: updated } = save(original, {});
    expect(member(updated)).toMatchObject({
      address: '/agent', agentRunId: 'agent-run', platformAgentRunId: null,
      launchConfiguration: { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'opus', llmConfig: null, autoExecuteTools: false, workspaceRootPath: '/workspace' },
      pendingRuntimeSwitch: { switchId: 'switch-1', from: { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt', llmConfig: { effort: 'medium' }, platformAgentRunId: 'thread-1' } },
    });
    expect(updated.rootTeam.defaultLaunchConfiguration.runtimeKind).toBe('codex_app_server');
    expect(member(original).pendingRuntimeSwitch).toBeUndefined();
  });

  it('a second save keeps the first previous binding and switch ID; choosing the previous runtime again is the undo', () => {
    const original = tree();
    original.rootTeam.members[0].platformAgentRunId = 'thread-1';
    const first = save(original, {}).tree;
    const second = save(first, { runtimeKind: RuntimeKind.ANTIGRAVITY_CLI, llmModelIdentifier: 'gemini' }, 'switch-2').tree;
    expect(member(second).pendingRuntimeSwitch).toEqual(member(first).pendingRuntimeSwitch);
    expect(member(second).launchConfiguration.runtimeKind).toBe('antigravity_cli');
    const undone = save(second, { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: 'gpt-mini' }, 'switch-3', 'same_session').tree;
    expect(member(undone)).toMatchObject({ platformAgentRunId: 'thread-1', launchConfiguration: { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-mini' } });
    expect(Object.hasOwn(member(undone), 'pendingRuntimeSwitch')).toBe(false);
  });

  it('the member\'s own runtime is a model-only edit that keeps a pending switch; the resolved target reports the pending switch', () => {
    const original = tree();
    const pending = save(original, {}).tree;
    const { targets, tree: edited } = save(pending, { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: 'sonnet' });
    expect(targets[0]!.pendingRuntimeSwitch).toEqual(member(pending).pendingRuntimeSwitch);
    expect(member(edited).launchConfiguration.llmModelIdentifier).toBe('sonnet');
    expect(member(edited).pendingRuntimeSwitch).toEqual(member(pending).pendingRuntimeSwitch);
  });

  it('the Team default scope takes the runtime into the default launch only; no member binding changes', () => {
    const original = tree();
    const targets = resolveTeamRunSelectionTargets(original, [{ scopeKind: 'CONFIGURED_TEAM', scopeAddress: '/', runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: 'opus', llmConfig: null }]);
    const updated = applyTeamRunSelectionPatches(original, targets);
    expect(updated.rootTeam.defaultLaunchConfiguration).toMatchObject({ runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'opus' });
    expect(member(updated)).toEqual(member(original));
  });
});

describe("a delegated team's recorded launch sources after a settings save (CR-461-078, design V-11)", () => {
  const agentDefault = { origin: "agent_default", fallbacks: [] };
  const teamDefault = { origin: "team_default", fallbacks: [] };
  const delegated = () => {
    const original = tree();
    original.rootTeam.defaultLaunchSource = teamDefault;
    original.rootTeam.members[0].launchSource = agentDefault;
    return original;
  };
  const patch = (scopeKind: string, scopeAddress: string, llmModelIdentifier: string) => ({
    scopeKind, scopeAddress, runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier, llmConfig: { effort: "medium" } } as any);

  const settings = { origin: "settings", fallbacks: [] };
  it("an edited member's launch becomes its own, recorded as the Settings edit; the team's stays", () => {
    const original = delegated();
    const updated: any = applyTeamRunSelectionPatches(original, withContinuation(resolveTeamRunSelectionTargets(original, [patch("CONFIGURED_AGENT", "/agent", "gpt-6")]), 'same_session'));
    expect(updated.rootTeam.members[0].launchSource).toEqual(settings);
    expect(updated.rootTeam.defaultLaunchSource).toEqual(teamDefault);
    // A member that followed its team (no source of its own) records the edit too: it never shows the team's origin again.
    const follower = tree();
    follower.rootTeam.defaultLaunchSource = teamDefault;
    const edited: any = applyTeamRunSelectionPatches(follower, withContinuation(resolveTeamRunSelectionTargets(follower, [patch("CONFIGURED_AGENT", "/agent", "gpt-6")]), 'same_session'));
    expect(edited.rootTeam.members[0].launchSource).toEqual(settings);
  });

  it("an edited team launch becomes its own, recorded as the Settings edit; the member's stays", () => {
    const original = delegated();
    const updated: any = applyTeamRunSelectionPatches(original, resolveTeamRunSelectionTargets(original, [patch("CONFIGURED_TEAM", "/", "gpt-6")]));
    expect(updated.rootTeam.defaultLaunchSource).toEqual(settings);
    expect(updated.rootTeam.members[0].launchSource).toEqual(agentDefault);
  });

  it("a save of the same selections changes nothing: both sources stay", () => {
    const original = delegated();
    const updated = applyTeamRunSelectionPatches(original, withContinuation(resolveTeamRunSelectionTargets(original,
      [patch("CONFIGURED_TEAM", "/", "gpt"), patch("CONFIGURED_AGENT", "/agent", "gpt")]), 'same_session'));
    expect(updated).toEqual(original);
  });
});
