import { describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'

import FileItem from '../FileItem.vue'
import { TreeNode } from '~/utils/fileExplorer/TreeNode'
import { useLocalization } from '~/composables/useLocalization'

vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }))

const translate = (key: string): string => useLocalization().t(key as never)

/**
 * A file list's icons (autobyteus-608 DC-011, DEC-003; AC-005): every file kind the list names has a local Iconify icon
 * (the app loads Font Awesome only as SVG components, so its `<i class="fa…">` icons rendered nothing). Markdown is a
 * document outline; the code kinds the file-type icons; other files the plain outline; the drag preview a document.
 * Production: FileItem and utils/fileExplorer/fileItemIcon.ts. Doubled: Iconify's Icon (shows the icon's name).
 */
const mountItem = (file: TreeNode) => {
  const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true })
  setActivePinia(pinia)
  const explorer = {
    openFolders: ref<Record<string, boolean>>({}), activeFile: ref<string | null>(null), workspaceId: ref('ws'),
    openFile: vi.fn(), openFilePreview: vi.fn(), toggleFolder: vi.fn(), renameFileOrFolder: vi.fn(),
    deleteFileOrFolder: vi.fn(), createFileOrFolder: vi.fn(), moveFileOrFolder: vi.fn(),
  }
  return mount(FileItem, {
    props: { file },
    global: {
      plugins: [pinia],
      mocks: { $t: translate },
      provide: {
        workspaceFileExplorer: explorer, fileExplorerPanelActive: ref(true), requestFileExplorerContextMenu: vi.fn(),
        fileExplorerReadOnly: computed(() => false),
      },
      stubs: { FileContextMenu: true, ConfirmDeleteDialog: true, AddFileOrFolderDialog: true },
    },
  })
}

const rowIcon = (name: string) => mountItem(new TreeNode(name, name, true)).find('.file-header [data-test="file-item-icon"]')

describe('FileItem icons', () => {
  it.each([
    ['lessons.md', 'heroicons:document-text', ['text-blue-500/80', 'h-3.5', 'w-3.5']],
    ['README.MD', 'heroicons:document-text', ['text-blue-500/80']],
    ['index.js', 'vscode-icons:file-type-js', []],
    ['store.ts', 'vscode-icons:file-type-typescript', []],
    ['App.vue', 'vscode-icons:file-type-vue', []],
    ['index.html', 'vscode-icons:file-type-html', []],
    ['main.css', 'vscode-icons:file-type-css', []],
    ['package.json', 'vscode-icons:file-type-json', []],
  ])('%s shows %s', (name, icon, classes) => {
    const found = rowIcon(name)
    expect(found.attributes('data-icon')).toBe(icon)
    expect(found.classes()).toEqual(expect.arrayContaining(classes))
  })

  it('shows the plain file outline for another kind, and no Font Awesome <i> icon anywhere', () => {
    const wrapper = mountItem(new TreeNode('notes.txt', 'notes.txt', true))
    expect(wrapper.find('.file-header [data-test="file-item-icon"]').exists()).toBe(false)
    expect(wrapper.find('.file-header .icon svg').exists()).toBe(true)
    for (const name of ['a.md', 'a.ts', 'a.json', 'folder']) {
      expect(mountItem(new TreeNode(name, name, name !== 'folder')).find('i').exists()).toBe(false)
    }
  })

  it("gives the drag preview a document icon for a file, and keeps a folder's own icons", () => {
    const file = mountItem(new TreeNode('lessons.md', 'lessons.md', true))
    expect(file.get('.drag-preview-icon [data-icon]').attributes('data-icon')).toBe('heroicons:document')
    const folder = mountItem(new TreeNode('records', 'records', false))
    expect(folder.find('.drag-preview-icon [data-icon]').exists()).toBe(false)
    expect(folder.find('.file-header [data-test="file-item-icon"]').exists()).toBe(false)
  })
})
