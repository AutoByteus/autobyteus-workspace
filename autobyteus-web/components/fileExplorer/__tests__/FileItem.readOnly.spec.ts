import { describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'

import FileItem from '../FileItem.vue'
import { TreeNode, convertJsonToTreeNode } from '~/utils/fileExplorer/TreeNode'
import { useLocalization } from '~/composables/useLocalization'

const translate = (key: string): string => useLocalization().t(key as never)

/**
 * The file explorer's read-only mode (autobyteus-554, the Memory page's semantic memory view, REQ-007, AC-006): a link
 * row says "Link · not opened" and does nothing; a file opens in preview only; no context menu and no drag.
 */
const mountItem = (file: TreeNode, readOnly: boolean) => {
  const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true })
  setActivePinia(pinia)
  const explorer = {
    openFolders: ref<Record<string, boolean>>({}),
    activeFile: ref<string | null>(null),
    workspaceId: ref('semantic_ws_operator'),
    openFile: vi.fn(),
    openFilePreview: vi.fn(),
    toggleFolder: vi.fn(),
    renameFileOrFolder: vi.fn(),
    deleteFileOrFolder: vi.fn(),
    createFileOrFolder: vi.fn(),
    moveFileOrFolder: vi.fn(),
  }
  const requestContextMenu = vi.fn()
  const wrapper = mount(FileItem, {
    props: { file },
    global: {
      plugins: [pinia],
      mocks: { $t: translate },
      provide: {
        workspaceFileExplorer: explorer,
        fileExplorerPanelActive: ref(true),
        requestFileExplorerContextMenu: requestContextMenu,
        fileExplorerReadOnly: computed(() => readOnly),
      },
      stubs: { FileContextMenu: true, ConfirmDeleteDialog: true, AddFileOrFolderDialog: true },
    },
  })
  return { wrapper, explorer, requestContextMenu }
}

describe('FileItem read-only mode', () => {
  it("reads a link from the node's tree JSON and shows it as a link row that opens nothing", async () => {
    const tree = convertJsonToTreeNode(JSON.stringify({
      id: 'root', name: 'operator', path: '', is_file: false, is_symbolic_link: false, children_loaded: true,
      children: [{ id: 'link', name: 'shared', path: 'shared', is_file: false, is_symbolic_link: true, children: [], children_loaded: true }],
    }))
    const link = tree.children[0]!
    expect(link.isLink).toBe(true)
    expect(tree.isLink).toBe(false)

    const { wrapper, explorer, requestContextMenu } = mountItem(link, true)
    const row = wrapper.get('[data-test="file-item-link"]')
    expect(row.text()).toContain('shared')
    expect(row.text()).toContain('Link · not opened')
    expect(row.attributes('aria-disabled')).toBe('true')
    expect(row.attributes('title')).toBe('A link to a file or folder outside this folder. Links are listed but never opened.')
    await row.trigger('click')
    await wrapper.trigger('contextmenu')
    expect(explorer.toggleFolder).not.toHaveBeenCalled()
    expect(explorer.openFile).not.toHaveBeenCalled()
    expect(explorer.openFilePreview).not.toHaveBeenCalled()
    expect(requestContextMenu).not.toHaveBeenCalled()
  })

  it('opens every file in preview, offers no context menu and is not draggable', async () => {
    const file = new TreeNode('notes.txt', 'notes.txt', true, [], 'file-id')
    const { wrapper, explorer, requestContextMenu } = mountItem(file, true)
    expect(wrapper.attributes('draggable')).toBe('false')
    await wrapper.get('.file-header').trigger('click')
    expect(explorer.openFilePreview).toHaveBeenCalledWith('notes.txt')
    expect(explorer.openFile).not.toHaveBeenCalled()
    await wrapper.trigger('contextmenu')
    expect(requestContextMenu).not.toHaveBeenCalled()
  })

  it('keeps editing for every other workspace: a text file opens for editing and has a context menu', async () => {
    const file = new TreeNode('notes.txt', 'notes.txt', true, [], 'file-id')
    const { wrapper, explorer, requestContextMenu } = mountItem(file, false)
    expect(wrapper.attributes('draggable')).toBe('true')
    await wrapper.get('.file-header').trigger('click')
    expect(explorer.openFile).toHaveBeenCalledWith('notes.txt')
    await wrapper.trigger('contextmenu')
    expect(requestContextMenu).toHaveBeenCalled()
  })
})
