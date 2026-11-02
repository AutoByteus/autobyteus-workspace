import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { describe, expect, it } from 'vitest';
import {
  applyTeamRunSelectionPatches,
  resolveTeamRunSelectionTargets,
} from '../../../src/agent-team-execution/services/team-run-selection-mutator.js';

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
    const updated = applyTeamRunSelectionPatches(original, targets);
    expect(updated.rootTeam.defaultLaunchConfiguration.llmConfig).toEqual({ effort: 'medium' });
    expect((updated.rootTeam.members[0] as any).launchConfiguration.llmConfig).toEqual({ effort: 'high' });
    expect((updated.rootTeam.members[0] as any).launchConfiguration.llmModelIdentifier).toBe('target');
    expect(original.rootTeam.members[0].launchConfiguration.llmConfig).toEqual({ effort: 'medium' });
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
  const save = (original: any, selection: Record<string, unknown>, switchId = 'switch-1') => {
    const targets = resolveTeamRunSelectionTargets(original, [{
      scopeKind: 'CONFIGURED_AGENT', scopeAddress: '/agent', runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: 'opus', llmConfig: null, ...selection,
    } as any]);
    return { targets, tree: applyTeamRunSelectionPatches(original, targets, () => switchId) };
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
    const undone = save(second, { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: 'gpt-mini' }, 'switch-3').tree;
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
