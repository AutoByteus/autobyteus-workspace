import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { reactive } from 'vue';

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
import { createMobileTestRouter, withSetup } from './mobileTestRouter';

/** A Team run whose member `lead` has a delegated task Team `review` with a member `checker` (depth-ordered rows). */
const teamEntry = () => {
  const row = (rowKey: string, depth: number, hasChildren: boolean, agentRunId: string | null) => ({
    kind: 'transient_execution', transientKind: 'task_agent', rowKey, depth, hasChildren, agentRunId, memberAddress: `/${rowKey}`,
    displayName: rowKey, memberKind: hasChildren ? 'agent_team' : 'agent', currentStatus: 'idle', teamRunIdForNode: null,
  });
  const executionRows = [row('lead', 0, true, 'lead-run'), row('review', 1, true, null), row('checker', 2, false, 'checker-run'), row('writer', 0, false, 'writer-run')];
  return { kind: 'team', key: 'team:t-1', runId: 't-1', name: 'Team', lastActivityAt: '', isActive: true, folderRootPath: null,
    team: { teamRunId: 't-1', executionRows, isActive: true } };
};
const agentEntry = { kind: 'agent', key: 'agent:host', runId: 'host', name: 'Host', lastActivityAt: '', isActive: false, folderRootPath: null,
  agentDefinitionId: 'd', avatarUrl: null, run: { runId: 'host', summary: '', currentStatus: 'idle', hasCollaboration: false } };

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

  it('a Team member deep in the Team: its Team and each ancestor row unfold, so its row is listed', async () => {
    const tree = await setup();
    expect(tree.rows.value.map((row) => row.key)).toEqual(['team:t-1']);
    tree.revealRow('team:t-1/checker');
    expect(list.store!.showRun).toHaveBeenCalledWith('t-1');
    expect(tree.rows.value.map((row) => row.key)).toEqual(['team:t-1', 'team:t-1/lead', 'team:t-1/review', 'team:t-1/checker', 'team:t-1/writer']);
    // Never closes a fold: revealing again keeps every row.
    tree.revealRow('team:t-1/checker');
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

  it('a delegated row inside task Teams: each ancestor task Team unfolds, from the host\'s published view', async () => {
    const collaboration = useAgentRunCollaborationStore();
    const taskRow = (rowKey: string, depth: number, teamRunIdForNode: string | null) => ({ row: { rowKey, depth, teamRunIdForNode }, teamStatus: null });
    const listTaskRows = vi.fn(() => [taskRow('team:outer', 0, 'outer'), taskRow('team:inner', 1, 'inner'), taskRow('agent:deep', 2, null), taskRow('agent:side', 0, null)]);
    collaboration.contextFor = vi.fn(() => reactive({ listTaskRows }) as never);
    const tree = await setup();
    tree.revealRow('agent:host/agent:deep');
    expect(listTaskRows).toHaveBeenCalled();
    expect(collaboration.isTaskTeamExpanded('host', 'outer')).toBe(true);
    expect(collaboration.isTaskTeamExpanded('host', 'inner')).toBe(true);
    tree.revealRow('agent:host/agent:deep');
    expect(collaboration.isTaskTeamExpanded('host', 'outer')).toBe(true);
    expect(collaboration.isTaskTeamExpanded('host', 'inner')).toBe(true);
  });
});
