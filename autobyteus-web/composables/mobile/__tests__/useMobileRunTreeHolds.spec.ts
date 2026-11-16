import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';

// The run list's entries are the test's; the tree store is the real one, its reads counted at the GraphQL client.
const list = vi.hoisted(() => ({ store: null as null | Record<string, any> }));
vi.mock('~/stores/runListStore', async () => {
  const { reactive: vueReactive } = await import('vue');
  list.store = vueReactive({ entries: [] as unknown[], shownEntries: [] as unknown[], showRun: vi.fn() });
  return { useRunListStore: () => list.store };
});
vi.mock('~/composables/projects/useTaskWorkerTasks', () => ({ useTaskWorkerTasks: () => ({ taskOf: () => null }) }));
const reads = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: reads.query }) }));

import { useMobileRunTree } from '../useMobileRunTree';
import { createMobileTestRouter, withSetup } from './mobileTestRouter';

/** A listed Agent run with delegated work: its tree is held while it is listed (its second line and fold need it). */
const agentEntry = (runId: string) => ({ kind: 'agent', key: `agent:${runId}`, runId, name: runId, lastActivityAt: '', isActive: false,
  folderRootPath: null, agentDefinitionId: 'd', avatarUrl: null, run: { runId, summary: '', currentStatus: 'idle', hasCollaboration: true } });
const treeReads = () => reads.query.mock.calls.map(([options]) => (options as { variables: { runId: string } }).variables.runId);

let pinia: Pinia;

// autobyteus-461 CR-461-112 (F-88, MSP-24): a listed tree is read when first shown and on each of its notices (AR-028).
describe('useMobileRunTree tree holds', () => {
  beforeEach(() => {
    pinia = createPinia(); setActivePinia(pinia);
    reads.query.mockReset();
    reads.query.mockImplementation(async ({ variables }: { variables: { kind: string; runId: string } }) =>
      ({ data: { runTree: { kind: variables.kind, runId: variables.runId, rows: [] } } }));
    list.store!.entries = []; list.store!.shownEntries = [];
  });

  it('a run that stays listed across a list reload keeps its tree, with no read again; a run that comes is read once', async () => {
    list.store!.shownEntries = [agentEntry('a'), agentEntry('b')];
    const router = await createMobileTestRouter();
    withSetup(router, useMobileRunTree, [pinia]);
    await flushPromises();
    expect(treeReads().sort()).toEqual(['a', 'b']);

    // The list is read again: new entries for the same runs, in another order (their last activity moved).
    reads.query.mockClear();
    list.store!.shownEntries = [agentEntry('b'), agentEntry('a')];
    await flushPromises();
    expect(treeReads()).toEqual([]);

    // A run leaves and another comes: only the new one is read.
    list.store!.shownEntries = [agentEntry('a'), agentEntry('c')];
    await flushPromises();
    expect(treeReads()).toEqual(['c']);
  });
});
