import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import FileExplorerTabs from '../FileExplorerTabs.vue'
import { useFileExplorerStore } from '~/stores/fileExplorer'
import { TreeNode } from '~/utils/fileExplorer/TreeNode'

const { query } = vi.hoisted(() => ({ query: vi.fn() }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query }) }))

describe('FileExplorerTabs unsaved content during peer modification (AC-010)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    query.mockResolvedValue({ data: { fileContent: 'peer committed bytes' } })
  })

  it.each([false, true])('retains the editor draft for Save, peer modify=%s', async (peerModify) => {
    const store = useFileExplorerStore()
    const workspaceId = 'unsaved-workspace'
    const state = store._getOrCreateWorkspaceState(workspaceId)
    const node = new TreeNode('notes.txt', 'notes.txt', true, [], 'notes-id')
    state.tree.addChild(node)
    state.nodeIdToNode[node.id] = node
    state.openFiles = [{
      path: node.path, type: 'Text', mode: 'edit', content: 'original bytes',
      url: null, relativeResourceContext: { kind: 'workspace', workspaceId },
      isLoading: false, error: null,
    }]
    state.activeFile = node.path
    const save = vi.spyOn(store, 'saveFileContentFromEditor').mockResolvedValue(undefined)
    const wrapper = mount(FileExplorerTabs, {
      props: { active: true, workspaceId },
      global: { mocks: { $t: (key: string) => key }, stubs: { FileViewer: true, Icon: true } },
    })
    try {
      wrapper.findComponent({ name: 'FileViewer' }).vm.$emit('update:modelValue', 'local unsaved draft')
      await nextTick()
      if (peerModify) {
        store.handleFileSystemChange(workspaceId, {
          changes: [{ type: 'modify', node_id: node.id, parent_id: state.tree.id }],
        })
        await flushPromises()
        expect(query).toHaveBeenCalledWith(expect.objectContaining({
          variables: { workspaceId, filePath: node.path }, fetchPolicy: 'network-only',
        }))
      }
      wrapper.findComponent({ name: 'FileViewer' }).vm.$emit('save')
      await flushPromises()
      expect(save).toHaveBeenCalledWith(workspaceId, node.path, 'local unsaved draft')
    } finally {
      wrapper.unmount()
    }
  })
})
