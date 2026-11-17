import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia, type Pinia } from 'pinia';

// The run list's entries are the test's; everything else is the real tree, disclosure and collaboration store.
const list = vi.hoisted(() => ({ store: null as null | Record<string, any> }));
vi.mock('~/stores/runListStore', async () => {
  const { reactive: vueReactive } = await import('vue');
  list.store = vueReactive({ entries: [] as unknown[], shownEntries: [] as unknown[], showRun: vi.fn() });
  return { useRunListStore: () => list.store };
});
vi.mock('~/composables/projects/useTaskWorkerTasks', () => ({ useTaskWorkerTasks: () => ({ taskOf: () => null }) }));

import { useMobileRunTree } from '../useMobileRunTree';
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore';
import { useRunTreeStore } from '~/stores/runTreeStore';
import type { RunTreeRowDto } from '@autobyteus/collaboration-stream-contracts';
import { createMobileTestRouter, withSetup } from './mobileTestRouter';

/** A Team run whose member `lead` has a delegated task Team `review` with a member `checker` (depth-ordered rows). */
const teamEntry = () => {
  const row = (rowKey: string, depth: number, hasChildren: boolean, agentRunId: string | null) => ({
    kind: 'delegated_run', delegatedRunKind: 'task_agent', rowKey, depth, hasChildren, agentRunId, memberAddress: `/${rowKey}`,
    displayName: rowKey, memberKind: hasChildren ? 'agent_team' : 'agent', currentStatus: 'idle', teamRunIdForNode: null,
  });
  const executionRows = [row('lead', 0, true, 'lead-run'), row('review', 1, true, null), row('checker', 2, false, 'checker-run'), row('writer', 0, false, 'writer-run')];
  return { kind: 'team', key: 'team:t-1', runId: 't-1', name: 'Team', lastActivityAt: '', isActive: true, folderRootPath: null,
    team: { teamRunId: 't-1', executionRows, isActive: true } };
};
const agentEntry = { kind: 'agent', key: 'agent:host', runId: 'host', name: 'Host', lastActivityAt: '', isActive: false, folderRootPath: null,
  agentDefinitionId: 'd', avatarUrl: null, run: { runId: 'host', summary: '', currentStatus: 'idle', hasCollaboration: false } };

/** A row of a run's tree as the server builds it (SR-084). */
const row = (key: string, parentKey: string | null, depth: number, kind: RunTreeRowDto['kind']): RunTreeRowDto => ({ key, parentKey, depth, kind,
  name: key, address: `/${key}`, openTarget: null, statusIds: [key] });

let pinia: Pinia;
const setup = async () => {
  const router = await createMobileTestRouter();
  const { result } = withSetup(router, useMobileRunTree, [pinia]);
  return result;
};

// autobyteus-435 DS-006 restore: `revealRow` opens the folds on a row's path (never closing one) so the row exists.
describe('useMobileRunTree.revealRow', () => {
  beforeEach(() => {
    pinia = createPinia(); setActivePinia(pinia);
    list.store!.entries = [teamEntry(), agentEntry];
    list.store!.shownEntries = [teamEntry()];
    list.store!.showRun.mockClear();
  });

  it('a row deep in a Team\'s tree: its Team and each row above it unfold, so its row is listed (SR-084)', async () => {
    useRunTreeStore().streamSnapshot({ kind: 'agent_team', runId: 't-1' }, [row('team:t-1', null, 0, 'team'), row('team_member:t-1:lead', 'team:t-1', 1, 'team_member'),
      row('team:review', 'team_member:t-1:lead', 2, 'team'), row('team_member:review:checker', 'team:review', 3, 'team_member'), row('team_member:t-1:writer', 'team:t-1', 1, 'team_member')]);
    const tree = await setup();
    expect(tree.rows.value.map((entry) => entry.key)).toEqual(['team:t-1']);
    tree.revealRow('team:t-1/team_member:review:checker');
    expect(list.store!.showRun).toHaveBeenCalledWith('t-1');
    expect(tree.rows.value.map((entry) => entry.key)).toEqual(['team:t-1', 'team:t-1/team_member:t-1:lead', 'team:t-1/team:review',
      'team:t-1/team_member:review:checker', 'team:t-1/team_member:t-1:writer']);
    // Never closes a fold: revealing again keeps every row.
    tree.revealRow('team:t-1/team_member:review:checker');
    expect(tree.rows.value).toHaveLength(5);
  });

  it('a top-level run among the older runs: the older runs\' fold opens for it; an unknown run reveals nothing', async () => {
    const tree = await setup();
    tree.revealRow('agent:host');
    expect(list.store!.showRun).toHaveBeenCalledWith('host');
    list.store!.showRun.mockClear();
    tree.revealRow('agent:unknown/agent:x');
    expect(list.store!.showRun).not.toHaveBeenCalled();
  });

  it('a delegated row inside delegated Teams: each team above it unfolds, from the run\'s tree (SR-084)', async () => {
    const collaboration = useAgentRunCollaborationStore();
    const rows = [row('agent:host', null, 0, 'agent'), row('team:outer', 'agent:host', 1, 'team'), row('team_member:outer:om', 'team:outer', 2, 'team_member'),
      row('team:inner', 'team_member:outer:om', 3, 'team'), row('team_member:inner:im', 'team:inner', 4, 'team_member'), row('agent:deep', 'team_member:inner:im', 5, 'agent')];
    useRunTreeStore().streamSnapshot({ kind: 'agent', runId: 'host' }, rows);
    const tree = await setup();
    tree.revealRow('agent:host/agent:deep');
    expect(collaboration.isTreeRowExpanded('host', rows[1]!)).toBe(true);
    expect(collaboration.isTreeRowExpanded('host', rows[3]!)).toBe(true);
    tree.revealRow('agent:host/agent:deep');
    expect(collaboration.isTreeRowExpanded('host', rows[1]!)).toBe(true);
    expect(collaboration.isTreeRowExpanded('host', rows[3]!)).toBe(true);
  });

  it('an Org agent\'s delegated runs show beside it on the phone (DEC-009); a delegated team starts folded; each folds by its toggle', async () => {
    const orgRun = { rootRunId: 'org-1', isActive: true, summary: '', executionTree: { rootOrg: { orgDefinitionId: 'org-def', members: [{ address: '/manager', agentRunId: 'manager' }] } } };
    const org = { kind: 'org', key: 'org:org-1', runId: 'org-1', name: 'Org', lastActivityAt: '', isActive: true, folderRootPath: null, orgRun };
    list.store!.entries = [org]; list.store!.shownEntries = [org];
    useRunTreeStore().streamSnapshot({ kind: 'agent_org', runId: 'org-1' }, [
      { ...row('org_agent:org-1:manager', null, 0, 'org_agent'), openTarget: { runKind: 'agent_org', runId: 'org-1', agentRunId: 'manager' } },
      { ...row('agent:writer', 'org_agent:org-1:manager', 1, 'agent'), openTarget: { runKind: 'agent', runId: 'writer', agentRunId: 'writer' } },
      { ...row('team:squad', 'org_agent:org-1:manager', 1, 'team'), openTarget: { runKind: 'agent_team', runId: 'squad', agentRunId: 'squad-lead' } },
      { ...row('team_member:squad:squad-lead', 'team:squad', 2, 'team_member'), openTarget: { runKind: 'agent_team', runId: 'squad', agentRunId: 'squad-lead' } },
    ]);
    const tree = await setup();
    const keys = () => tree.rows.value.map((candidate) => candidate.key);
    expect(keys()).toEqual(expect.arrayContaining(['org:org-1/agent:writer', 'org:org-1/team:squad']));
    expect(keys()).not.toContain('org:org-1/team_member:squad:squad-lead');
    const manager = tree.rows.value.find((candidate) => candidate.key === 'org:org-1/org_agent:org-1:manager')!;
    expect(manager.expanded).toBe(true);
    tree.toggle(manager.fold!);
    expect(keys()).not.toContain('org:org-1/agent:writer');
  });
});
