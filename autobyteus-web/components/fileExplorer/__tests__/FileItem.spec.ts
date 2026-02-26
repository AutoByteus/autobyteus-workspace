import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'

import FileItem from '../FileItem.vue'
import { useWorkspaceStore } from '~/stores/workspace'
import { TreeNode } from '~/utils/fileExplorer/TreeNode'

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

describe('FileItem - Lazy Loading', () => {
  const createMockFolder = (childrenLoaded: boolean = false): TreeNode => {
    return new TreeNode(
      'test-folder',
      'root/test-folder',
      false, // is_file
      [],    // children
      'folder-id',
      childrenLoaded
    )
  }

  const createMockFile = (): TreeNode => {
    return new TreeNode(
      'test-file.txt',
      'root/test-file.txt',
      true, // is_file
      [],
      'file-id'
    )
  }

  const createMockPreviewableFile = (): TreeNode => {
    return new TreeNode(
      'README.md',
      'root/README.md',
      true, // is_file
      [],
      'preview-file-id'
    )
  }

  const mountComponent = async (file: TreeNode) => {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true })
    setActivePinia(pinia)

    const workspaceStore = useWorkspaceStore()

    const explorer = {
      openFolders: ref<Record<string, boolean>>({}),
      activeFile: ref<string | null>(null),
      workspaceId: ref('test-workspace-id'),
      openFile: vi.fn(),
      openFilePreview: vi.fn(),
      toggleFolder: vi.fn(),
      renameFileOrFolder: vi.fn(),
      deleteFileOrFolder: vi.fn(),
      createFileOrFolder: vi.fn(),
      moveFileOrFolder: vi.fn(),
    }

    // Mock the activeWorkspace getter
    Object.defineProperty(workspaceStore, 'activeWorkspace', {
      get: () => ({
        workspaceId: 'test-workspace-id',
        name: 'Test Workspace',
        fileExplorer: new TreeNode('root', 'root', false, [], 'root-id', true),
        nodeIdToNode: {},
        workspaceConfig: {},
        absolutePath: '/test/path'
      }),
      configurable: true
    })

    const wrapper = mount(FileItem, {
      props: { file },
      global: {
        plugins: [pinia],
        provide: {
          workspaceFileExplorer: explorer,
        },
        stubs: {
          // Stub child components to avoid deep rendering issues
          FileContextMenu: true,
          ConfirmDeleteDialog: true,
          AddFileOrFolderDialog: true,
        }
      },
    })

    await flushPromises()
    return { wrapper, explorer, workspaceStore }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should trigger fetchFolderChildren when expanding unloaded folder', async () => {
    const unloadedFolder = createMockFolder(false) // childrenLoaded = false
    const { wrapper, explorer, workspaceStore } = await mountComponent(unloadedFolder)
    explorer.openFolders.value[unloadedFolder.path] = true

    // Click on the file item (folder)
    const fileHeader = wrapper.find('.file-header')
    await fileHeader.trigger('click')
    await flushPromises()

    // Verify toggleFolder was called
    expect(explorer.toggleFolder).toHaveBeenCalledWith('root/test-folder')

    // Verify fetchFolderChildren was called because folder wasn't loaded
    expect(workspaceStore.fetchFolderChildren).toHaveBeenCalledWith(
      'test-workspace-id',
      'root/test-folder'
    )
  })

  it('should NOT trigger fetchFolderChildren when expanding already-loaded folder', async () => {
    const loadedFolder = createMockFolder(true) // childrenLoaded = true
    const { wrapper, explorer, workspaceStore } = await mountComponent(loadedFolder)
    explorer.openFolders.value[loadedFolder.path] = true

    // Click on the file item
    const fileHeader = wrapper.find('.file-header')
    await fileHeader.trigger('click')
    await flushPromises()

    // Verify toggleFolder was called
    expect(explorer.toggleFolder).toHaveBeenCalledWith('root/test-folder')

    // fetchFolderChildren should NOT be called since folder is already loaded
    expect(workspaceStore.fetchFolderChildren).not.toHaveBeenCalled()
  })

  it('should NOT trigger fetchFolderChildren when collapsing a folder', async () => {
    const unloadedFolder = createMockFolder(false)
    const { wrapper, explorer, workspaceStore } = await mountComponent(unloadedFolder)
    explorer.openFolders.value[unloadedFolder.path] = false

    // Click on the file item
    const fileHeader = wrapper.find('.file-header')
    await fileHeader.trigger('click')
    await flushPromises()

    // toggleFolder should be called
    expect(explorer.toggleFolder).toHaveBeenCalled()

    // fetchFolderChildren should NOT be called when collapsing
    expect(workspaceStore.fetchFolderChildren).not.toHaveBeenCalled()
  })

  it('should open file instead of fetching children when clicking a file', async () => {
    const file = createMockFile()
    const { wrapper, explorer, workspaceStore } = await mountComponent(file)

    // Click on the file item
    const fileHeader = wrapper.find('.file-header')
    await fileHeader.trigger('click')
    await flushPromises()

    // openFile should be called, not toggleFolder
    expect(explorer.openFile).toHaveBeenCalledWith('root/test-file.txt')
    expect(explorer.toggleFolder).not.toHaveBeenCalled()
    expect(workspaceStore.fetchFolderChildren).not.toHaveBeenCalled()
  })

  it('should open file in preview mode when clicking a previewable file', async () => {
    const file = createMockPreviewableFile()
    const { wrapper, explorer } = await mountComponent(file)

    await wrapper.find('.file-header').trigger('click')
    await flushPromises()

    expect(explorer.openFilePreview).toHaveBeenCalledWith('root/README.md')
    expect(explorer.openFile).not.toHaveBeenCalled()
  })
})
