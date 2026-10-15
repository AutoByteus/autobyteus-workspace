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

describe('FileExplorerTabs visible draft lifecycle', () => {
  beforeEach(() => {
    setActivePinia(createPinia()); vi.clearAllMocks(); wrappers = []
    query.mockResolvedValue({ data: { fileContent: 'peer committed' } })
    mutate.mockResolvedValue({ data: { writeFileContent: JSON.stringify({ changes: [] }) } })
  })
  afterEach(() => { wrappers.forEach(w => w.unmount()); document.body.innerHTML = '' })

  it.each(['local draft', ''])('keeps visible draft %j and the same editor through pending peer reload', async draft => {
    const { file, peer } = addFile(); const w = subject(); const pending = deferred()
    query.mockReturnValueOnce(pending.promise)
    await w.get('textarea').setValue(draft)
    const editor = w.get('textarea').element
    peer(); await nextTick()
    expect(file.isLoading).toBe(true)
    expect(w.get('textarea').element).toBe(editor)
    expect(value(w)).toBe(draft)
    pending.resolve({ data: { fileContent: 'peer committed' } }); await flushPromises()
    expect(file.content).toBe('peer committed')
    expect(value(w)).toBe(draft)
    await save(w)
    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ variables: {
      workspaceId: 'draft-a', filePath: 'notes.md', content: draft,
    } }))
    expect(file.editorDraft).toBeUndefined()
  })

  it('refreshes a clean reader and one returned to clean by undo', async () => {
    const { file, peer } = addFile(); const w = subject()
    await w.get('textarea').setValue('draft')
    await w.get('textarea').setValue(file.content!)
    expect(file.editorDraft).toBeUndefined()
    peer(); await flushPromises()
    expect(value(w)).toBe('peer committed')
  })

  it('keeps drafts through tab/workspace selection, reopening an open path, and component remount', async () => {
    const { store } = addFile(); addFile('draft-b'); addFile('draft-a', 'other.md')
    store.setActiveFile('notes.md', 'draft-a')
    const w = subject(); await w.get('textarea').setValue('A draft')
    store.setActiveFile('other.md', 'draft-a'); await nextTick()
    expect(value(w)).toBe('draft-a original')
    await w.setProps({ workspaceId: 'draft-b' }); expect(value(w)).toBe('draft-b original')
    await w.get('textarea').setValue('B draft')
    await store.openFile('notes.md', 'draft-a'); await w.setProps({ workspaceId: 'draft-a' })
    expect(value(w)).toBe('A draft')
    w.unmount(); const reopened = subject(); expect(value(reopened)).toBe('A draft')
    await save(reopened)
    expect(mutate.mock.calls[0][0].variables).toEqual({ workspaceId: 'draft-a', filePath: 'notes.md', content: 'A draft' })
    expect(store.getActiveFileData('draft-b')?.editorDraft?.content).toBe('B draft')
  })

  it('keeps drafts through Zen remount and previews committed bytes without exposing a draft', async () => {
    const { store, file, peer } = addFile(); const w = subject()
    await w.get('textarea').setValue('draft')
    useFileContentDisplayModeStore().toggleZenMode(); await nextTick()
    expect((document.querySelector('textarea') as HTMLTextAreaElement).value).toBe('draft')
    useFileContentDisplayModeStore().toggleZenMode(); await nextTick()
    store.setFileMode(file.path, 'preview', 'draft-a'); peer(); await flushPromises()
    expect(w.get('article').text()).toBe('peer committed')
    store.setFileMode(file.path, 'edit', 'draft-a'); await nextTick()
    expect(value(w)).toBe('draft')
    await store.openFilePreview(file.path, 'draft-a', { accessIntent: { source: 'event-monitor', readOnly: true } })
    await nextTick(); expect(w.find('textarea').exists()).toBe(false)
    w.getComponent(FileViewer).vm.$emit('save'); await flushPromises()
    expect(mutate).not.toHaveBeenCalled()
    store.updateEditorDraft('draft-a', file.path, 'forbidden')
    expect(file.editorDraft?.content).toBe('draft')
  })

  it('retains failed-save drafts and later keystrokes while a save is pending', async () => {
    const { file } = addFile(); const w = subject(); await w.get('textarea').setValue('draft')
    mutate.mockRejectedValueOnce(new Error('write refused'))
    await save(w); expect(value(w)).toBe('draft'); expect(w.text()).toContain('write refused')
    const pending = deferred(); mutate.mockReturnValueOnce(pending.promise)
    await save(w); await w.get('textarea').setValue('later edit')
    pending.resolve({ data: { writeFileContent: JSON.stringify({ changes: [] }) } }); await flushPromises()
    expect(file.content).toBe('draft'); expect(value(w)).toBe('later edit')
    expect(file.editorDraft?.content).toBe('later edit')
  })

  it('shows a refresh error without hiding an existing draft', async () => {
    const { store, file } = addFile(); const w = subject(); await w.get('textarea').setValue('draft')
    file.content = null; query.mockRejectedValueOnce(new Error('read refused'))
    await expect(store.fetchFileContent(file.path, 'draft-a')).rejects.toThrow('read refused')
    await nextTick(); expect(w.get('[role="alert"]').text()).toBe('read refused')
    expect(value(w)).toBe('draft')
  })

  it('discards only on explicit close and reopens committed content, not the retired draft', async () => {
    const { store, file } = addFile(); const w = subject(); await w.get('textarea').setValue('draft')
    store.closeFile(file.path, 'draft-a'); await nextTick()
    expect(w.find('textarea').exists()).toBe(false)
    await store.openFile(file.path, 'draft-a'); await flushPromises()
    expect(value(w)).toBe('peer committed')
    expect(store.getActiveFileData('draft-a')?.editorDraft).toBeUndefined()
  })
})
