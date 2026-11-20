import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import SemanticMemoryFolder from '../SemanticMemoryFolder.vue';
import { useSemanticMemoryFolderStore, type SemanticMemoryFolderState } from '~/stores/semanticMemoryFolderStore';
import { useWorkspaceStore } from '~/stores/workspace';
import { useLocalization } from '~/composables/useLocalization';

const translate = (key: string, params?: Record<string, unknown>): string => useLocalization().t(key as never, params as never);

/**
 * The read-only semantic memory folder view (autobyteus-554, REQ-005, REQ-007, REQ-008, REQ-012; VIS-002, 005, 006,
 * 007, 014, 015): its states, and the node's read-only workspace held only while a folder with files is shown.
 */
const mountFolder = (props: { agentDefinitionId: string | null; imported?: boolean }, folder: SemanticMemoryFolderState | null) => {
  const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
  const store = useSemanticMemoryFolderStore();
  const workspaces = useWorkspaceStore();
  vi.mocked(store.folderOf).mockReturnValue(folder);
  vi.mocked(workspaces.registerSemanticMemoryWorkspace).mockImplementation((id: string) => id);
  vi.mocked(workspaces.fetchFolderChildren).mockResolvedValue(undefined);
  const wrapper = mount(SemanticMemoryFolder, {
    props: { agentName: 'Operator', imported: false, ...props },
    global: {
      plugins: [pinia],
      mocks: { $t: translate },
      stubs: {
        FileExplorer: { props: { workspaceId: String, readOnly: Boolean }, template: '<div data-test="explorer">{{ workspaceId }}|{{ readOnly }}</div>' },
        FileExplorerTabs: { props: { workspaceId: String, readOnly: Boolean }, template: '<div data-test="tabs">{{ workspaceId }}|{{ readOnly }}</div>' },
      },
    },
  });
  return { wrapper, store, workspaces };
};

describe('SemanticMemoryFolder', () => {
  it('shows an imported source the not-synced note and asks the node nothing', () => {
    const { wrapper, store, workspaces } = mountFolder({ agentDefinitionId: 'operator', imported: true }, null);
    expect(wrapper.get('[data-test="semantic-memory-not-synced"]').text()).toContain('Semantic memory is not part of synced memory');
    expect(wrapper.text()).toContain('Memory Sync copies runs and their Work Journals.');
    expect(store.clear).toHaveBeenCalled();
    expect(store.open).not.toHaveBeenCalled();
    expect(workspaces.registerSemanticMemoryWorkspace).not.toHaveBeenCalled();
  });

  it("shows an agent's missing and empty folder states without a path, a panel or a workspace", () => {
    const missing = mountFolder({ agentDefinitionId: 'operator' }, { folderPath: '/m/semantic/operator', exists: false, isEmpty: true });
    expect(missing.store.open).toHaveBeenCalledWith('operator');
    expect(missing.wrapper.get('[data-test="semantic-memory-empty"] h2').text()).toBe('No semantic memory yet');
    expect(missing.wrapper.get('[data-test="semantic-memory-empty"] p').text()).toBe('The folder is created when Operator next runs.');
    expect(missing.wrapper.find('[data-test="semantic-memory-path"]').exists()).toBe(false);
    expect(missing.workspaces.registerSemanticMemoryWorkspace).not.toHaveBeenCalled();

    const empty = mountFolder({ agentDefinitionId: 'operator' }, { folderPath: '/m/semantic/operator', exists: true, isEmpty: true });
    expect(empty.wrapper.get('[data-test="semantic-memory-empty"] p').text()).toBe('Operator has not written anything to its folder yet.');
  });

  it("shows Global's own missing and empty copy", () => {
    const missing = mountFolder({ agentDefinitionId: null }, { folderPath: '/m/semantic-global', exists: false, isEmpty: true }).wrapper;
    expect(missing.get('[data-test="semantic-memory-empty"] h2').text()).toBe('No global memory yet');
    expect(missing.get('[data-test="semantic-memory-empty"] p').text()).toBe('The folder is created when an agent next runs.');
    expect(mountFolder({ agentDefinitionId: null }, { folderPath: '/m/semantic-global', exists: true, isEmpty: true }).wrapper.text())
      .toContain('Nothing has been written to global memory yet.');
  });

  it("holds the node's read-only workspace for a folder with files, shows it read only, and releases it on leaving", async () => {
    const { wrapper, workspaces } = mountFolder({ agentDefinitionId: 'team-local-agent:se:designer' }, { folderPath: '/m/semantic/team-local-agent%3Ase%3Adesigner', exists: true, isEmpty: false });
    await flushPromises();
    const workspaceId = 'semantic_ws_team-local-agent%3Ase%3Adesigner';
    expect(workspaces.registerSemanticMemoryWorkspace).toHaveBeenCalledWith(workspaceId, 'Operator', '/m/semantic/team-local-agent%3Ase%3Adesigner');
    expect(workspaces.fetchFolderChildren).toHaveBeenCalledWith(workspaceId, '');
    expect(wrapper.get('[data-test="semantic-memory-path"]').text()).toBe('/m/semantic/team-local-agent%3Ase%3Adesigner');
    expect(wrapper.get('[data-test="explorer"]').text()).toBe(`${workspaceId}|true`);
    expect(wrapper.get('[data-test="tabs"]').text()).toBe(`${workspaceId}|true`);
    wrapper.unmount();
    expect(workspaces.unregisterTransientWorkspace).toHaveBeenCalledWith(workspaceId);
  });

  it('releases the workspace when the view is left while its first listing is pending, and ignores the late listing (CR-001)', async () => {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false });
    const folders = useSemanticMemoryFolderStore();
    vi.spyOn(folders, 'open').mockResolvedValue(undefined as never);
    vi.spyOn(folders, 'folderOf').mockReturnValue({ folderPath: '/m/semantic/operator', exists: true, isEmpty: false });
    const workspaces = useWorkspaceStore();
    let finishListing!: () => void;
    vi.spyOn(workspaces, 'fetchFolderChildren').mockImplementation(() => new Promise<void>((resolve) => { finishListing = resolve; }));
    const semanticEntries = () => Object.keys(workspaces.workspaces).filter((id) => id.startsWith('semantic_'));
    const wrapper = mount(SemanticMemoryFolder, {
      props: { agentDefinitionId: 'operator', agentName: 'Operator', imported: false },
      global: { plugins: [pinia], mocks: { $t: translate }, stubs: { FileExplorer: true, FileExplorerTabs: true } },
    });
    await flushPromises();
    expect(workspaces.fetchFolderChildren).toHaveBeenCalledWith('semantic_ws_operator', '');
    expect(semanticEntries()).toEqual(['semantic_ws_operator']);
    expect(workspaces.workspaceMetadataById.semantic_ws_operator?.kind).toBe('semantic_memory');
    expect(wrapper.text()).toContain('Loading the folder');

    wrapper.unmount();
    expect(semanticEntries()).toEqual([]);
    expect(workspaces.workspaceMetadataById.semantic_ws_operator).toBeUndefined();
    finishListing();
    await flushPromises();
    expect(semanticEntries()).toEqual([]);
    expect(Object.values(workspaces.workspaceMetadataById).some((metadata: any) => metadata?.kind === 'semantic_memory')).toBe(false);
  });

  it('shows only the current folder when the agent changes while the first listing is pending (CR-001)', async () => {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false });
    const folders = useSemanticMemoryFolderStore();
    vi.spyOn(folders, 'open').mockResolvedValue(undefined as never);
    vi.spyOn(folders, 'folderOf').mockImplementation((id: string | null) => ({ folderPath: `/m/semantic/${id}`, exists: true, isEmpty: false }));
    const workspaces = useWorkspaceStore();
    const pending = new Map<string, () => void>();
    vi.spyOn(workspaces, 'fetchFolderChildren').mockImplementation((id: string) => new Promise<void>((resolve) => { pending.set(id, resolve); }));
    const semanticEntries = () => Object.keys(workspaces.workspaces).filter((id) => id.startsWith('semantic_'));
    const wrapper = mount(SemanticMemoryFolder, {
      props: { agentDefinitionId: 'first', agentName: 'First', imported: false },
      global: {
        plugins: [pinia],
        mocks: { $t: translate },
        stubs: { FileExplorer: { props: { workspaceId: String }, template: '<div data-test="explorer">{{ workspaceId }}</div>' }, FileExplorerTabs: true },
      },
    });
    await flushPromises();
    await wrapper.setProps({ agentDefinitionId: 'second', agentName: 'Second' });
    await flushPromises();
    expect(semanticEntries()).toEqual(['semantic_ws_second']);

    pending.get('semantic_ws_first')!();
    await flushPromises();
    expect(wrapper.find('[data-test="explorer"]').exists()).toBe(false);
    pending.get('semantic_ws_second')!();
    await flushPromises();
    expect(wrapper.get('[data-test="explorer"]').text()).toBe('semantic_ws_second');
    expect(semanticEntries()).toEqual(['semantic_ws_second']);
    wrapper.unmount();
    expect(semanticEntries()).toEqual([]);
  });

  it('uses the global workspace for Global', async () => {
    const { workspaces } = mountFolder({ agentDefinitionId: null }, { folderPath: '/m/semantic-global', exists: true, isEmpty: false });
    await flushPromises();
    expect(workspaces.registerSemanticMemoryWorkspace).toHaveBeenCalledWith('semantic_global_ws', 'Operator', '/m/semantic-global');
  });
});
