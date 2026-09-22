import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import FileExplorer from '../FileExplorer.vue';
import { useWorkspaceStore } from '~/stores/workspace';
import { useFileExplorerStore } from '~/stores/fileExplorer';
import { TreeNode } from '~/utils/fileExplorer/TreeNode';
import { createWorkspaceMetadata } from '~/utils/workspaceMetadata';

const transport = vi.hoisted(() => ({ mutate: vi.fn(), query: vi.fn() }));
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => transport }));
vi.mock('@iconify/vue', () => ({ Icon: { template: '<span />' } }));

let wrapper: VueWrapper | undefined;
beforeEach(() => { transport.mutate.mockReset(); transport.query.mockReset(); });
afterEach(() => { wrapper?.unmount(); wrapper = undefined; vi.restoreAllMocks(); });

describe('FileExplorer metadata-only target activation (AC-004/005)', () => {
  it('registers the recovered target once and leaves Loading without recursive updates', async () => {
    const pinia = createPinia(); setActivePinia(pinia);
    const store = useWorkspaceStore();
    const metadata = createWorkspaceMetadata({ workspaceId: 'ws-recovered-b', workspaceRootPath: '/owned/B', displayName: 'B', kind: 'filesystem' });
    store.cacheWorkspaceMetadata(metadata);
    // Real reactive metadata registration remains in place. Only external transport
    // and file stream are substituted; delayed registration matches a real HTTP turn.
    let resolveRegistration!: (value: unknown) => void;
    transport.mutate.mockReturnValue(new Promise(resolve => { resolveRegistration = resolve; }));
    const acquire = vi.spyOn(store, 'acquireFileExplorerLiveSession').mockReturnValue(vi.fn());
    const errors: unknown[] = [];
    wrapper = mount(FileExplorer, { props: { workspaceId: metadata.workspaceId, active: true }, global: {
      plugins: [pinia], mocks: { $t: (key: string) => key },
      config: { errorHandler: error => { errors.push(error); } },
      stubs: { FileItem: true, FileContextMenu: true, ConfirmDeleteDialog: true, AddFileOrFolderDialog: true },
    } });
    await nextTick().catch(error => { errors.push(error); });
    resolveRegistration({ data: { createWorkspace: { workspaceId: metadata.workspaceId, name: 'B', workspaceRootPath: '/owned/B', absolutePath: '/owned/B', config: { rootPath: '/owned/B' }, kind: 'filesystem' } } });
    for (let step = 0; step < 5; step += 1) {
      await Promise.resolve(); await nextTick().catch(error => { errors.push(error); });
    }
    expect(transport.mutate).toHaveBeenCalledTimes(1);
    expect(errors.map(String)).toEqual([]);
    expect(wrapper.text()).not.toContain('Loading workspace');
    expect(acquire).toHaveBeenCalledTimes(1);
  });
});


const deferred = () => {
  let resolve!: (value: unknown) => void, reject!: (error: Error) => void;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const metadataFor = (id: string) => createWorkspaceMetadata({ workspaceId: id, workspaceRootPath: `/owned/${id}`, displayName: id });
const registeredInfo = (id: string) => ({ workspaceId: id, name: id, absolutePath: `/owned/${id}`, workspaceRootPath: `/owned/${id}`, workspaceConfig: {} });
const responseFor = (id: string) => ({ data: { createWorkspace: { ...registeredInfo(id), config: { rootPath: `/owned/${id}` }, kind: 'filesystem' } } });
const flush = async () => { await flushPromises(); await nextTick(); };

const setupActivation = () => {
  const pinia = createPinia(); setActivePinia(pinia);
  const store = useWorkspaceStore(), files = useFileExplorerStore();
  const release = vi.fn();
  const acquire = vi.spyOn(store, 'acquireFileExplorerLiveSession').mockReturnValue(release);
  const ensure = vi.spyOn(store, 'ensureWorkspaceMetadata'); // Real action, not a registration stub.
  const errors: unknown[] = [];
  const open = (workspaceId?: string) => {
    wrapper = mount(FileExplorer, { props: { workspaceId }, global: {
      plugins: [pinia], mocks: { $t: (key: string) => key },
      config: { errorHandler: error => { errors.push(error); } },
      stubs: { FileItem: { props: ['file'], template: '<div>{{ file.name }}</div>' },
        FileContextMenu: true, ConfirmDeleteDialog: true, AddFileOrFolderDialog: true },
    } });
    return wrapper;
  };
  const tree = (id: string) => { files._getOrCreateWorkspaceState(id).tree.children = [new TreeNode(`${id}.txt`, `${id}.txt`, true, [], `${id}-file`)]; };
  return { store, files, release, acquire, ensure, errors, open, tree };
};

describe('FileExplorer activation semantic inputs and settlement', () => {
  it('waits without Loading for missing metadata and activates when it arrives at the same explicit ID', async () => {
    const h = setupActivation(), pending = deferred();
    transport.mutate.mockReturnValue(pending.promise);
    const panel = h.open('B'); await flush();
    expect(panel.text()).not.toContain('Loading workspace');
    expect(transport.mutate).not.toHaveBeenCalled(); expect(h.acquire).not.toHaveBeenCalled();
    h.store.cacheWorkspaceMetadata(metadataFor('B')); await flush();
    expect(panel.text()).toContain('Loading workspace');
    expect(transport.mutate).toHaveBeenCalledTimes(1);
    h.tree('B'); pending.resolve(responseFor('B')); await flush();
    expect(panel.text()).not.toContain('Loading workspace'); expect(panel.text()).toContain('B.txt');
    expect(h.acquire).toHaveBeenCalledOnce(); expect(h.errors).toEqual([]);
  });

  it('does not restart pending registration or its lease for equivalent metadata/workspace replacements', async () => {
    const h = setupActivation(), pending = deferred();
    h.store.cacheWorkspaceMetadata(metadataFor('B')); transport.mutate.mockReturnValue(pending.promise);
    const panel = h.open('B'); await flush();
    for (let i = 0; i < 3; i++) { h.store.cacheWorkspaceMetadata(metadataFor('B')); await flush(); }
    expect(h.ensure).toHaveBeenCalledOnce(); expect(transport.mutate).toHaveBeenCalledOnce();
    expect(panel.text()).toContain('Loading workspace');
    pending.resolve(responseFor('B')); await flush();
    const consumer = h.acquire.mock.calls[0]![1];
    for (let i = 0; i < 3; i++) {
      h.store.cacheWorkspaceMetadata({ ...metadataFor('B'), displayName: `renamed-${i}` });
      h.store.workspaces.B = { ...h.store.workspaces.B! }; await flush();
    }
    expect(h.ensure).toHaveBeenCalledOnce(); expect(h.acquire).toHaveBeenCalledOnce();
    expect(h.release).not.toHaveBeenCalled(); expect(panel.text()).not.toContain('Loading workspace');
    await panel.setProps({ active: false }); expect(h.release).toHaveBeenCalledOnce();
    await panel.setProps({ active: true }); await flush();
    expect(h.acquire).toHaveBeenCalledTimes(2); expect(h.acquire.mock.lastCall).toEqual(['B', consumer]);
    expect(transport.mutate).toHaveBeenCalledOnce(); panel.unmount();
    expect(h.release).toHaveBeenCalledTimes(2); expect(h.errors).toEqual([]);
  });

  it('uses the already-registered path without metadata or registration work', async () => {
    const h = setupActivation(); h.store.workspaces.B = registeredInfo('B'); h.tree('B');
    const panel = h.open('B'); await flush();
    expect(panel.text()).toContain('B.txt'); expect(panel.text()).not.toContain('Loading workspace');
    expect(h.ensure).not.toHaveBeenCalled(); expect(h.acquire).toHaveBeenCalledOnce(); expect(h.errors).toEqual([]);
  });

  it('settles rejection and allows the existing Retry to register once more', async () => {
    const h = setupActivation(), first = deferred(), retry = deferred();
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    h.store.cacheWorkspaceMetadata(metadataFor('B'));
    transport.mutate.mockReturnValueOnce(first.promise).mockReturnValueOnce(retry.promise);
    const panel = h.open('B'); first.reject(new Error('registration unavailable')); await flush();
    expect(panel.text()).not.toContain('Loading workspace'); expect(panel.text()).toContain('registration unavailable');
    expect(h.acquire).not.toHaveBeenCalled(); expect(logged).toHaveBeenCalled();
    await panel.get('button').trigger('click'); await flush();
    expect(panel.text()).toContain('Loading workspace'); expect(panel.text()).not.toContain('registration unavailable');
    h.tree('B'); retry.resolve(responseFor('B')); await flush();
    expect(panel.text()).toContain('B.txt'); expect(panel.find('button').exists()).toBe(false);
    expect(panel.text()).not.toContain('Loading workspace'); expect(transport.mutate).toHaveBeenCalledTimes(2);
    expect(h.acquire).toHaveBeenCalledOnce(); expect(h.errors).toEqual([]);
  });

  it.each(['resolve', 'reject'] as const)('settles a newer registered fast path and ignores old %s', async completion => {
    const h = setupActivation(), pending = deferred();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    h.store.cacheWorkspaceMetadata(metadataFor('B')); h.store.workspaces.C = registeredInfo('C'); h.tree('C');
    transport.mutate.mockReturnValue(pending.promise);
    const panel = h.open('B'); await flush(); expect(panel.text()).toContain('Loading workspace');
    await panel.setProps({ workspaceId: 'C' }); await flush();
    expect(panel.text()).not.toContain('Loading workspace'); expect(panel.text()).toContain('C.txt');
    if (completion === 'resolve') pending.resolve(responseFor('B')); else pending.reject(new Error('stale B failure'));
    await flush();
    expect(panel.text()).not.toContain('stale B failure'); expect(panel.text()).toContain('C.txt');
    expect(h.acquire.mock.calls.map(call => call[0])).toEqual(['C']); expect(h.release).not.toHaveBeenCalled(); expect(h.errors).toEqual([]);
  });

  it('settles a newer no-metadata path and never leases the old completed target', async () => {
    const h = setupActivation(), pending = deferred();
    h.store.cacheWorkspaceMetadata(metadataFor('B')); transport.mutate.mockReturnValue(pending.promise);
    const panel = h.open('B'); await flush();
    await panel.setProps({ workspaceId: 'C' });
    expect(panel.text()).not.toContain('Loading workspace');
    pending.resolve(responseFor('B')); await flush();
    expect(panel.text()).not.toContain('Loading workspace'); expect(h.acquire).not.toHaveBeenCalled(); expect(h.errors).toEqual([]);
  });

  it('does not let an old rejection settle a newer pending activation', async () => {
    const h = setupActivation(), old = deferred(), current = deferred();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const id of ['B', 'C']) h.store.cacheWorkspaceMetadata(metadataFor(id));
    transport.mutate.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    const panel = h.open('B'); await flush(); await panel.setProps({ workspaceId: 'C' });
    old.reject(new Error('old B')); await flush();
    expect(panel.text()).toContain('Loading workspace'); expect(panel.text()).not.toContain('old B');
    h.tree('C'); current.resolve(responseFor('C')); await flush();
    expect(panel.text()).not.toContain('Loading workspace'); expect(panel.text()).toContain('C.txt');
    expect(h.acquire.mock.calls.map(call => call[0])).toEqual(['C']); expect(h.errors).toEqual([]);
  });

  it.each(['inactive', 'unmount'] as const)('does not lease or publish errors after pending activation becomes %s', async action => {
    const h = setupActivation(), pending = deferred();
    h.store.cacheWorkspaceMetadata(metadataFor('B')); transport.mutate.mockReturnValue(pending.promise);
    const panel = h.open('B'); await flush();
    if (action === 'inactive') await panel.setProps({ active: false }); else panel.unmount();
    pending.resolve(responseFor('B')); await flush();
    expect(h.acquire).not.toHaveBeenCalled(); expect(h.errors).toEqual([]);
    if (action === 'inactive') {
      expect(panel.text()).not.toContain('Loading workspace');
      await panel.setProps({ active: true }); await flush();
      expect(h.acquire).toHaveBeenCalledOnce(); expect(transport.mutate).toHaveBeenCalledOnce();
    }
  });

  it('releases the old lease while a different target registers and acquires only the new target on settlement', async () => {
    const h = setupActivation(), pending = deferred();
    h.store.workspaces.A = registeredInfo('A'); h.tree('A');
    h.store.cacheWorkspaceMetadata(metadataFor('B')); transport.mutate.mockReturnValue(pending.promise);
    const panel = h.open('A'); await flush();
    const consumer = h.acquire.mock.calls[0]![1];
    await panel.setProps({ workspaceId: 'B' }); await flush();
    expect(panel.text()).toContain('Loading workspace'); expect(panel.text()).not.toContain('A.txt');
    expect(h.release).toHaveBeenCalledOnce(); expect(h.acquire).toHaveBeenCalledOnce();
    h.tree('B'); pending.resolve(responseFor('B')); await flush();
    expect(panel.text()).toContain('B.txt'); expect(panel.text()).not.toContain('Loading workspace');
    expect(h.acquire.mock.calls).toEqual([['A', consumer], ['B', consumer]]); expect(h.errors).toEqual([]);
  });

  it.each(['inactive', 'unmount'] as const)('ignores a rejection after activation becomes %s', async action => {
    const h = setupActivation(), pending = deferred();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    h.store.cacheWorkspaceMetadata(metadataFor('B')); transport.mutate.mockReturnValue(pending.promise);
    const panel = h.open('B'); await flush();
    const instance = panel.vm as unknown as { activationError: string | null; isActivatingWorkspace: boolean };
    if (action === 'inactive') await panel.setProps({ active: false }); else panel.unmount();
    pending.reject(new Error('stale completion')); await flush();
    expect(instance.activationError).toBeNull(); expect(instance.isActivatingWorkspace).toBe(false);
    expect(h.acquire).not.toHaveBeenCalled(); expect(h.errors).toEqual([]);
  });

});
