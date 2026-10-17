// AC010/CR008: real Tabs -> FileViewer -> store refresh/save path. Only Monaco's
// native editor and GraphQL transport are doubles; this is not mounted-NFS proof.
// pnpm -C autobyteus-web test:nuxt components/fileExplorer/__tests__/FileExplorerTabs.draftViewer.spec.ts --run
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import FileExplorerTabs from '../FileExplorerTabs.vue'
import FileViewer from '../FileViewer.vue'
import { useFileExplorerStore } from '~/stores/fileExplorer'
import { useFileContentDisplayModeStore } from '~/stores/fileContentDisplayMode'
import { TreeNode } from '~/utils/fileExplorer/TreeNode'

const { query, mutate } = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn() }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query, mutate }) }))
vi.mock('~/components/fileExplorer/MonacoEditor.vue', () => ({ default: {
  name: 'MonacoEditor', props: ['modelValue', 'readOnly', 'language'], emits: ['update:modelValue', 'save'],
  template: `<textarea :value="modelValue" :readonly="readOnly" @input="$emit('update:modelValue', $event.target.value)" @keydown.ctrl.s.prevent="$emit('save')" />`,
} }))
vi.mock('~/components/fileExplorer/viewers/MarkdownPreviewer.vue', () => ({ default: {
  name: 'MarkdownPreviewer', props: ['content'], template: '<article>{{ content }}</article>',
} }))

const deferred = () => {
  let resolve!: (value: any) => void
  let reject!: (reason: Error) => void
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
let wrappers: VueWrapper[]
const subject = (workspaceId = 'draft-a') => {
  const wrapper = mount(FileExplorerTabs, {
    props: { workspaceId }, attachTo: document.body,
    global: { mocks: { $t: (key: string) => key }, stubs: { Icon: true } },
  })
  wrappers.push(wrapper)
  return wrapper
}
const addFile = (workspaceId = 'draft-a', path = 'notes.md') => {
  const store = useFileExplorerStore()
  const state = store._getOrCreateWorkspaceState(workspaceId)
  const node = new TreeNode(path, path, true, [], `${workspaceId}-${path}`)
  state.tree.addChild(node)
  state.nodeIdToNode[node.id] = node
  state.openFiles.push({ path, type: 'Text', mode: 'edit', content: `${workspaceId} original`,
    url: null, relativeResourceContext: { kind: 'workspace', workspaceId }, isLoading: false, error: null })
  state.activeFile = path
  const file = state.openFiles.at(-1)!
  const peer = () => store.handleFileSystemChange(workspaceId, {
    changes: [{ type: 'modify', node_id: node.id, parent_id: state.tree.id }],
  })
  return { store, state, file, peer }
}
const value = (w: VueWrapper) => (w.get('textarea').element as HTMLTextAreaElement).value
const save = async (w: VueWrapper) => {
  await w.get('textarea').trigger('keydown', { key: 's', ctrlKey: true })
  await flushPromises()
}

// Reviewer-only diagnostic of the established no-unsaved-overwrite contract.
// Real Tabs/FileViewer/store; editor and mutation response are controlled doubles.
// Saving a checkpoint then continuing to edit is a single ongoing editing goal.
// Response control observes an ordinary pending request; it is not a production latency claim.
describe('CRR015 pending-save draft preservation', () => {
  beforeEach(() => {
    setActivePinia(createPinia()); vi.clearAllMocks(); wrappers = []
    query.mockResolvedValue({ data: { fileContent: 'peer committed' } })
    mutate.mockResolvedValue({ data: { writeFileContent: JSON.stringify({ changes: [] }) } })
  })
  afterEach(() => { wrappers.forEach(w => w.unmount()); document.body.innerHTML = '' })
  it.each(['draft-a original', 'later independent edit'])('preserves later input %j through Save completion', async laterInput => {
    const { file, state } = addFile(); const w = subject(); const pending = deferred()
    await w.get('textarea').setValue('saved checkpoint')
    mutate.mockReturnValueOnce(pending.promise)
    await save(w)
    expect(state.saveContentLoading['notes.md']).toBe(true)
    expect((w.get('textarea').element as HTMLTextAreaElement).readOnly).toBe(false)
    await w.get('textarea').setValue(laterInput)
    const afterInput = { visible: value(w), draft: file.editorDraft?.content ?? null, committed: file.content }
    pending.resolve({ data: { writeFileContent: JSON.stringify({ changes: [] }) } }); await flushPromises()
    const afterComplete = { visible: value(w), draft: file.editorDraft?.content ?? null, committed: file.content }
    await save(w)
    const submitted = mutate.mock.calls.map(call => call[0].variables.content)
    console.log('CRR015_PROBE', JSON.stringify({ laterInput, afterInput, afterComplete, submitted }))
    expect.soft(afterComplete.visible).toBe(laterInput)
    expect.soft(submitted).toEqual(['saved checkpoint', laterInput])
  })
})
