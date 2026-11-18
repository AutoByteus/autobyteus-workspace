import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildAgentOrgHistoryRow } from '~/test-support/historyFamilyPublicationFixture';
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { parseAgentOrgHistoryItem } from '../runHistoryStoreSupport';
import { buildRunHistoryNavigationProjection, hasListedRun } from '../runHistoryNavigationProjection';
import { applyRunNavigationEffectToProjection } from '../runHistoryNavigationPatches';
import type { RunHistoryWorkspaceGroup } from '../runHistoryTypes';

// workspace-tree-vs-chooser (REQ-009, AC-012, DS-004): the Workspaces view lists a folder, Temp workspace included, only while
// it has a listed run: an Agent run that is not an unsent New chat draft, a Team run or an Org run of its root.
const timestamp = '2026-11-05T10:00:00.000Z';
beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(timestamp));
});
afterAll(() => vi.useRealTimers());

const workspace = (workspaceId: string, workspaceRootPath: string, kind = 'filesystem') =>
  ({ workspaceId, workspaceRootPath, name: workspaceRootPath.split('/').at(-1)!, kind, isTemp: kind === 'temp' });
const WORKSPACES = [
  workspace('ws-agent', '/work/agent'),
  workspace('ws-team', '/work/team'),
  workspace('ws-org', '/work/org'),
  workspace('ws-draft', '/work/draft'),
  workspace('ws-empty', '/work/empty'),
  workspace('temp_ws_default', '/work/temp', 'temp'),
];

const agentGroup = (root: string, runId: string): RunHistoryWorkspaceGroup => ({
  workspaceRootPath: root,
  workspaceName: root.split('/').at(-1)!,
  agentDefinitions: [{ agentDefinitionId: 'writer', agentName: 'Writer', runs: [{
    runId, summary: 'Notes', createdAt: timestamp, lastActivityAt: timestamp, status: AgentStatus.Offline, isActive: false,
  }] }],
  teamDefinitions: [],
});

const context = (runId: string, root: string, status: AgentStatus) => [runId, {
  config: { agentDefinitionId: 'writer', agentDefinitionName: 'Writer', workspaceId: null, workspaceMetadata: { workspaceRootPath: root } },
  state: { runId, currentStatus: status, conversation: { id: runId, messages: [], createdAt: timestamp, updatedAt: timestamp } },
}] as const;

const teamContext = (root: string) => {
  const worker = testAgentNode('/worker', { displayName: 'Worker', agentRunId: 'team-worker-run' });
  return buildTestTeamContext({
    teamRunId: 'team-run', teamDefinitionId: 'team-def', teamDefinitionName: 'Team', coordinatorAddress: worker.address,
    focusedAgentRunId: worker.agentRunId, rootChildren: [worker], workspaceRootPath: root, isActive: false,
  });
};

const build = (input: Partial<Parameters<typeof buildRunHistoryNavigationProjection>[0]> = {}) => buildRunHistoryNavigationProjection({
  workspaceGroups: [agentGroup('/work/agent', 'agent-run')],
  agentAvatarByDefinitionId: {},
  allWorkspaces: WORKSPACES,
  workspacesById: {},
  agentContexts: new Map([context('temp-draft', '/work/draft', AgentStatus.Offline)]) as never,
  teamContexts: [teamContext('/work/team')],
  agentOrgHistory: [parseAgentOrgHistoryItem(buildAgentOrgHistoryRow({ rootRunId: 'org-run', workspaceRootPath: '/work/org' }))],
  ...input,
});
const roots = (projection: ReturnType<typeof build>) => projection.workspaceNodes.map((node) => node.workspaceRootPath).sort();

describe('the Workspaces view lists only folders with a listed run', () => {
  it('lists the folders with an Agent run, only Team runs or only Org runs; not an empty or a draft-only folder, nor an empty Temp', () => {
    expect(roots(build())).toEqual(['/work/agent', '/work/org', '/work/team']);
  });

  it('Temp workspace follows the same rule', () => {
    expect(roots(build({ workspaceGroups: [agentGroup('/work/temp', 'temp-run')] }))).toEqual(['/work/org', '/work/team', '/work/temp']);
  });

  it('a prepared or just-started run of this session (not yet in the history) lists its folder', () => {
    const projection = build({ agentContexts: new Map([context('run-new', '/work/draft', AgentStatus.Initializing)]) as never });
    expect(roots(projection)).toContain('/work/draft');
  });

  it('builds the indexes and ancestries for listed folders only', () => {
    const projection = build({ workspaceGroups: [agentGroup('/work/agent', 'agent-run')] });
    expect(Object.keys(projection.runIndexById)).toEqual(['agent-run']);
    expect(Object.values(projection.runAncestryById).map((ancestry) => ancestry.workspaceId)).toEqual(['workspace:/work/agent']);
    expect(projection.teamAncestryById['team-run']?.workspaceId).toBe('workspace:/work/team');
    expect(projection.agentOrgAncestryById['org-run']?.workspaceId).toBe('workspace:/work/org');
  });

  it('hasListedRun counts a Team row of the root, an Org run, and any Agent row but an unsent draft', () => {
    const node = (sources: string[], orgRuns = 0) => ({
      stableKey: 'k', workspaceId: 'k', workspaceRootPath: '/k', workspaceName: 'k', workspaceKind: 'filesystem' as const,
      agents: sources.length ? [{ agentDefinitionId: 'a', agentName: 'A', runs: sources.map((source, index) => ({ runId: `r${index}`, source })) }] : [],
      agentOrgDefinitions: orgRuns ? [{ stableKey: 'o', definitionId: 'o', name: 'O', runs: [{}] }] : [],
    }) as never;
    expect(hasListedRun(node(['draft']), [])).toBe(false);
    expect(hasListedRun(node([]), [])).toBe(false);
    expect(hasListedRun(node(['draft', 'local']), [])).toBe(true);
    expect(hasListedRun(node(['history']), [])).toBe(true);
    expect(hasListedRun(node([], 1), [])).toBe(true);
    expect(hasListedRun(node([]), [{ teamRunId: 't' } as never])).toBe(true);
  });

  // CR-001 (REQ-002, AC-002): a folder removed in the chat chooser leaves every view of the left panel, whatever kind of
  // stopped run it still has; its runs stay in the history (the Runs view) and on disk.
  describe('a removed folder leaves the Workspaces view', () => {
    const registeredWithout = (...roots: string[]) => WORKSPACES.filter((entry) => !roots.includes(entry.workspaceRootPath));

    it.each([
      ['a stopped Agent run', '/work/agent'],
      ['a stopped Team run', '/work/team'],
      ['a stopped Org run', '/work/org'],
    ])('a folder with %s', (_kind, root) => {
      const projection = build({ allWorkspaces: registeredWithout(root) });
      expect(roots(projection)).not.toContain(root);
      expect(projection.workspaceNodes.map((node) => node.workspaceId).filter((id) => id.startsWith('history:'))).toEqual([]);
    });

    it('all three removed: no folder is listed, and no index or ancestry points at them', () => {
      const projection = build({ allWorkspaces: registeredWithout('/work/agent', '/work/team', '/work/org') });
      expect(projection.workspaceNodes).toEqual([]);
      expect(projection.runIndexById).toEqual({});
      expect(projection.agentOrgAncestryById).toEqual({});
    });

    it('stays out after the next read: the same history read again, and a status change of one of its runs, rebuild without it', () => {
      const allWorkspaces = registeredWithout('/work/agent', '/work/team', '/work/org');
      const reread = build({ allWorkspaces });
      expect(roots(reread)).toEqual([]);
      const patched = applyRunNavigationEffectToProjection(reread,
        { kind: 'standalone', runId: 'agent-run', currentStatus: AgentStatus.Offline },
        { kind: 'PRESENTATION', occurredAt: timestamp });
      expect(patched).toEqual({ state: reread, changed: false, rebuild: true });
      expect(roots(build({ allWorkspaces }))).toEqual([]);
    });

    it('a registered Org-only folder is still listed (AC-012), with its Org run', () => {
      const projection = build({ workspaceGroups: [], teamContexts: [] });
      expect(roots(projection)).toEqual(['/work/org']);
      expect(projection.workspaceNodes[0]!.workspaceId).toBe('ws-org');
      expect(projection.workspaceNodes[0]!.agentOrgDefinitions.flatMap((group) => group.runs.map((run) => run.rootRunId))).toEqual(['org-run']);
    });
  });

  it('a status change of a run outside the listed folders asks for a rebuild (the first sent message, VIS-017); activity does not', () => {
    const projection = build();
    const status = applyRunNavigationEffectToProjection(projection,
      { kind: 'standalone', runId: 'temp-draft', currentStatus: AgentStatus.Initializing },
      { kind: 'PRESENTATION', occurredAt: timestamp });
    expect(status).toEqual({ state: projection, changed: false, rebuild: true });
    const activity = applyRunNavigationEffectToProjection(projection,
      { kind: 'standalone', runId: 'temp-draft', currentStatus: AgentStatus.Running },
      { kind: 'ACTIVITY', occurredAt: timestamp });
    expect(activity).toEqual({ state: projection, changed: false });
  });
});
