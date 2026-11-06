import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { RUN_LIST_SHOWN, useRunListStore } from '~/stores/runListStore';
import type { RunHistoryWorkspaceGroup } from '~/stores/runHistoryTypes';

const historyOf = (count: number): RunHistoryWorkspaceGroup[] => [{
  workspaceRootPath: '/ws/a', workspaceName: 'a', teamDefinitions: [],
  agentDefinitions: [{ agentDefinitionId: 'agent-1', agentName: 'Daily Assistant', runs: Array.from({ length: count }, (_, index) => ({
    runId: `run-${index + 1}`, summary: `Run ${index + 1}`, createdAt: new Date(Date.UTC(2026, 9, 30 - index)).toISOString(),
    status: 'offline', isActive: false,
  })) }],
}] as unknown as RunHistoryWorkspaceGroup[];

describe('runListStore: the newest five and the fold (UIS-004)', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('shows the newest five and keeps the rest behind the fold', async () => {
    useRunHistoryStore().workspaceGroups = historyOf(8);
    const list = useRunListStore();
    expect(RUN_LIST_SHOWN).toBe(5);
    expect(list.shownEntries.map((entry) => entry.runId)).toEqual(['run-1', 'run-2', 'run-3', 'run-4', 'run-5']);
    expect(list.olderEntries.map((entry) => entry.runId)).toEqual(['run-6', 'run-7', 'run-8']);
    list.setOlderShown(true);
    expect(list.shownEntries).toHaveLength(8);
    list.setOlderShown(false);
    expect(list.shownEntries).toHaveLength(5);
  });

  it('has no fold with five runs or fewer, and never opens one', () => {
    useRunHistoryStore().workspaceGroups = historyOf(5);
    const list = useRunListStore();
    list.setOlderShown(true);
    expect(list.olderEntries).toEqual([]);
    expect(list.olderShown).toBe(false);
  });

  it('opens the fold for an older run only (UIT-011)', () => {
    useRunHistoryStore().workspaceGroups = historyOf(8);
    const list = useRunListStore();
    list.showRun('run-2');
    expect(list.olderShown).toBe(false);
    list.showRun('run-7');
    expect(list.olderShown).toBe(true);
  });

  it('closes the fold when nothing remains beyond the newest five (UIT-010)', async () => {
    const history = useRunHistoryStore();
    history.workspaceGroups = historyOf(8);
    const list = useRunListStore();
    list.setOlderShown(true);
    history.workspaceGroups = historyOf(5);
    await nextTick();
    expect(list.olderShown).toBe(false);
    history.workspaceGroups = historyOf(8);
    expect(list.shownEntries).toHaveLength(5);
  });
});
