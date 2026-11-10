import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { ref } from 'vue';
import { useMobileNavigation } from '../useMobileNavigation';
import { useMobileSubjectRestore } from '../useMobileSubjectRestore';
import { useMobileRunOpeningStore } from '~/stores/mobileRunOpeningStore';
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import type { MobileRunTreeRow } from '~/utils/mobile/mobileRunTreeProjection';
import { createMobileTestRouter, withSetup } from './mobileTestRouter';

const rowOf = (key: string): MobileRunTreeRow => ({
  key, depth: key.includes('/') ? 1 : 0, avatar: 'agent', name: 'n', title: '', status: 'idle', remote: null, hasChildren: false,
  expanded: false, fold: null, open: { kind: 'agentRun', run: { runId: key } as never }, lastActivityAt: null,
});
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
};

let pinia: Pinia;
/**
 * The restore with the real router, navigation and pending-open store. The run tree and the open action are its
 * parameters: the tree lists `listed` once `revealRow` ran for a child row (a top-level row is listed at once).
 */
const start = async (query: Record<string, string>, listed: string[] = []) => {
  const router = await createMobileTestRouter(query);
  const revealed = new Set<string>();
  const rows = ref<MobileRunTreeRow[]>([]);
  const refreshRows = () => { rows.value = listed.filter((key) => !key.includes('/') || revealed.has(key)).map(rowOf); };
  refreshRows();
  const tree = { rows, revealRow: vi.fn((key: string) => { revealed.add(key); refreshRows(); }) };
  const store = useMobileRunOpeningStore();
  const opening = { reopen: vi.fn(async (row: MobileRunTreeRow) => { store.commit(row.key); }) };
  const firstCheck = deferred();
  const { result, unmount } = withSetup(router, () => {
    const navigation = useMobileNavigation();
    return { navigation, ...useMobileSubjectRestore({ tree: tree as never, opening: opening as never, navigation, firstCheck: firstCheck.promise }) };
  }, [pinia]);
  const settleFirstCheck = async () => { firstCheck.resolve(); await flushPromises(); };
  return { router, tree, opening, store, result, unmount, settleFirstCheck, query: () => ({ ...router.currentRoute.value.query }) };
};

// autobyteus-435 REQ-005, DS-006 restore steps 1–7, AC-005-1…7.
describe('useMobileSubjectRestore', () => {
  beforeEach(() => { pinia = createPinia(); setActivePinia(pinia); });

  it('begins at once: "Opening…" (the pending open) and nothing replaces the screen until the first check ended (AC-005-7)', async () => {
    const { result, store, opening, settleFirstCheck, query } = await start({ row: 'agent:run-1', screen: 'desktop', full: '1' }, ['agent:run-1']);
    expect(result.restoring.value).toBe(true);
    expect(store.pending).toEqual({ key: 'agent:run-1', status: 'opening' });
    await flushPromises();
    expect(query()).toEqual({ row: 'agent:run-1', screen: 'desktop', full: '1' });
    expect(opening.reopen).not.toHaveBeenCalled();

    await settleFirstCheck();
    // The row is in the history read: it reopens with the shared action; the route (full screen too) stays.
    expect(opening.reopen).toHaveBeenCalledWith(expect.objectContaining({ key: 'agent:run-1' }));
    expect(query()).toEqual({ row: 'agent:run-1', screen: 'desktop', full: '1' });
    expect(result.restoring.value).toBe(false);
    expect(store.pending).toBeNull();
    expect(store.failure).toBeNull();
  });

  it('a Team run and a Team member: the member\'s row is revealed (its Team and ancestor folds), then reopened (AC-005-3)', async () => {
    const team = await start({ row: 'team:t-1', screen: 'messages' }, ['team:t-1']);
    await team.settleFirstCheck();
    expect(team.opening.reopen).toHaveBeenCalledWith(expect.objectContaining({ key: 'team:t-1' }));
    team.unmount();

    const member = await start({ row: 'team:t-1/member:writer', screen: 'files' }, ['team:t-1', 'team:t-1/member:writer']);
    await member.settleFirstCheck();
    expect(member.tree.revealRow).toHaveBeenCalledWith('team:t-1/member:writer');
    expect(member.opening.reopen).toHaveBeenCalledWith(expect.objectContaining({ key: 'team:t-1/member:writer' }));
  });

  it('a subject no longer in the list after the reads: the list, with no failure to react to (AC-005-1, AC-005-3)', async () => {
    const { result, store, opening, settleFirstCheck, query } = await start({ row: 'agent:gone', screen: 'desktop' }, ['agent:other']);
    await settleFirstCheck();
    expect(opening.reopen).not.toHaveBeenCalled();
    expect(query()).toEqual({ row: 'agent:gone' });
    expect(result.restoring.value).toBe(false);
    expect(store.pending).toBeNull();
    expect(store.failure).toBeNull();
  });

  it('the first history read failed (node not reachable, Phone Access off): the list, which shows its connection state (AC-005-5)', async () => {
    const { opening, settleFirstCheck, query } = await start({ row: 'agent:run-1', screen: 'run' }, ['agent:run-1']);
    useRunHistoryStore().error = 'Response not successful: Received status code 403';
    await settleFirstCheck();
    expect(opening.reopen).not.toHaveBeenCalled();
    expect(query()).toEqual({ row: 'agent:run-1' });
  });

  describe('a delegated row (agent:<host>/<row>)', () => {
    const KEY = 'agent:host/agent:cua-run';

    it('waits for the host\'s view, still "Opening…", then reveals the row and reopens it (AC-005-7)', async () => {
      const collaboration = useAgentRunCollaborationStore();
      const view = deferred();
      let published = false;
      collaboration.contextFor = vi.fn(() => (published ? {} as never : null));
      collaboration.inspect = vi.fn(async () => { await view.promise; published = true; });
      const { result, store, tree, opening, settleFirstCheck, query } = await start({ row: KEY, screen: 'desktop' }, ['agent:host', KEY]);
      await settleFirstCheck();
      expect(collaboration.inspect).toHaveBeenCalledWith('host');
      expect(result.restoring.value).toBe(true);
      expect(store.pending?.key).toBe(KEY);
      expect(query()).toEqual({ row: KEY, screen: 'desktop' });

      view.resolve(); await flushPromises();
      expect(tree.revealRow).toHaveBeenCalledWith(KEY);
      expect(opening.reopen).toHaveBeenCalledWith(expect.objectContaining({ key: KEY }));
      expect(result.restoring.value).toBe(false);
    });

    it('reads nothing more when the host\'s view is already published', async () => {
      const collaboration = useAgentRunCollaborationStore();
      collaboration.contextFor = vi.fn(() => ({}) as never);
      collaboration.inspect = vi.fn(async () => undefined);
      const { opening, settleFirstCheck } = await start({ row: KEY, screen: 'run' }, ['agent:host', KEY]);
      await settleFirstCheck();
      expect(collaboration.inspect).not.toHaveBeenCalled();
      expect(opening.reopen).toHaveBeenCalledTimes(1);
    });

    it('the host\'s view cannot be read: the list (DEC-014)', async () => {
      const collaboration = useAgentRunCollaborationStore();
      collaboration.contextFor = vi.fn(() => null);
      collaboration.inspect = vi.fn(async () => { collaboration.errors.host = 'Response not successful: Received status code 502'; });
      const { opening, settleFirstCheck, query } = await start({ row: KEY, screen: 'run' }, ['agent:host', KEY]);
      await settleFirstCheck();
      expect(opening.reopen).not.toHaveBeenCalled();
      expect(query()).toEqual({ row: KEY });
    });
  });

  describe('superseded: it acts no more', () => {
    it('a tap on another row while it waits', async () => {
      const { store, opening, settleFirstCheck, query } = await start({ row: 'agent:run-1', screen: 'run' }, ['agent:run-1']);
      store.begin('agent:tapped');
      await settleFirstCheck();
      expect(opening.reopen).not.toHaveBeenCalled();
      expect(store.pending?.key).toBe('agent:tapped');
      expect(query()).toEqual({ row: 'agent:run-1', screen: 'run' });
    });

    it('Back to the list while it waits: its pending open ends', async () => {
      const { result, store, opening, settleFirstCheck } = await start({ row: 'agent:run-1', screen: 'run' }, ['agent:run-1']);
      await result.navigation.back();
      await settleFirstCheck();
      expect(opening.reopen).not.toHaveBeenCalled();
      expect(store.pending).toBeNull();
      expect(store.failure).toBeNull();
    });

    it('the shell ends while it waits (the session rejected at the first check): nothing under the pairing screen', async () => {
      const { router, store, opening, unmount, settleFirstCheck } = await start({ row: 'agent:run-1', screen: 'desktop' }, ['agent:run-1']);
      const routeWrites = [vi.spyOn(router, 'replace'), vi.spyOn(router, 'push')];
      useRunHistoryStore().error = 'Response not successful: Received status code 401';
      unmount();
      expect(store.pending).toBeNull();
      await settleFirstCheck();
      expect(opening.reopen).not.toHaveBeenCalled();
      for (const write of routeWrites) expect(write).not.toHaveBeenCalled();
    });
  });

  it.each([
    ['the list', { row: 'agent:run-1' }],
    ['New run', { row: 'agent:run-1', screen: 'new' }],
    ['a screen with no row (an old saved URL)', { screen: 'desktop', full: '1' }],
  ])('restores nothing on %s', async (_name, query) => {
    const { result, store, opening, settleFirstCheck } = await start(query, ['agent:run-1']);
    expect(result.restoring.value).toBe(false);
    expect(store.pending).toBeNull();
    await settleFirstCheck();
    expect(opening.reopen).not.toHaveBeenCalled();
  });
});
