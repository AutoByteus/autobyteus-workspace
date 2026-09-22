import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, nextTick, onBeforeUnmount, onMounted } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'

const io = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn(), route: null as any }))
vi.mock('vue-router', async importOriginal => {
  const actual = await importOriginal<typeof import('vue-router')>()
  const { reactive } = await import('vue')
  io.route = reactive({ path: '/workspace', query: {} })
  const navigate = async (location: any) => { Object.assign(io.route, location) }
  return { ...actual, useRoute: () => io.route, useRouter: () => ({ push: navigate, replace: navigate }) }
})
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io }))
vi.mock('~/services/agentOrgExecution/agentOrgReferenceProjection', () => ({
  loadAgentOrgImmediateReferenceProjection: vi.fn().mockResolvedValue({ agents: {}, teams: {} }),
}))

import RightSideTabs from '../RightSideTabs.vue'
import FileExplorerLayout from '~/components/fileExplorer/FileExplorerLayout.vue'
import FileExplorer from '~/components/fileExplorer/FileExplorer.vue'
import FileExplorerTabs from '~/components/fileExplorer/FileExplorerTabs.vue'
import { useWorkspaceStore } from '~/stores/workspace'
import { useFileExplorerStore } from '~/stores/fileExplorer'
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore'
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { useWorkspaceHistorySubjectActions } from '~/composables/useWorkspaceHistorySubjectActions'
import { useRunActions } from '~/composables/useRunActions'
import { useRightSideTabs } from '~/composables/useRightSideTabs'
import { TreeNode } from '~/utils/fileExplorer/TreeNode'

// Only the external editor renderer is replaced; both Files consumers, target fallback,
// global workspace getter, launch draft, History selection and config publication are real.
const EditorRenderer = defineComponent({
  name: 'FileViewer', props: ['file'], emits: ['save'],
  setup(props, { emit }) {
    const key = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') { event.preventDefault(); emit('save') }
    }
    onMounted(() => window.addEventListener('keydown', key))
    onBeforeUnmount(() => window.removeEventListener('keydown', key))
    return () => h('div', { 'data-test': 'editor-content' }, props.file.content)
  },
})
const mounted: ReturnType<typeof mount>[] = []
afterEach(() => { mounted.splice(0).forEach(wrapper => wrapper.unmount()); vi.restoreAllMocks() })
beforeEach(() => { setActivePinia(createPinia()); io.query.mockReset(); io.mutate.mockReset(); io.route.query = {} })
const flush = async () => { await flushPromises(); await nextTick() }
const metadata = (id: string) => ({ workspaceId: id, workspaceRootPath: `/workspace/${id}`, displayName: id, kind: 'filesystem' as const })
const pressSave = async () => {
  for (const modifier of ['ctrlKey', 'metaKey']) window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', [modifier]: true }))
  await flush()
}
const register = (id: string) => {
  const workspace = useWorkspaceStore(), files = useFileExplorerStore()
  workspace.workspaces[id] = { workspaceId: id, name: id, absolutePath: `/workspace/${id}`, workspaceConfig: {} }
  workspace.cacheWorkspaceMetadata(metadata(id))
  const state = files._getOrCreateWorkspaceState(id)
  state.tree.children = [new TreeNode(`${id}.txt`, `${id}.txt`, true, [], `${id}-file`)]
}
const mountPanel = () => {
  const wrapper = mount(RightSideTabs, { global: { stubs: {
    FileViewer: EditorRenderer, ProgressPanel: true, TerminalPanel: { props: ['workspaceMetadata'], template: '<div />' },
    BrowserPanel: true, VncViewer: true, ArtifactsTab: true, CollaborationOverviewPanel: true,
  } } })
  mounted.push(wrapper); return wrapper
}

for (const previouslyMounted of [false, true]) {
  it(`retains A while canonical B metadata fails; prior consumers mounted: ${previouslyMounted}`, async () => {
    const workspace = useWorkspaceStore(), files = useFileExplorerStore(), history = useRunHistoryStore()
    register('A'); register('C')
    const released = vi.fn()
    const acquire = vi.spyOn(workspace, 'acquireFileExplorerLiveSession').mockReturnValue(released)
    const readFile = vi.spyOn(files, 'fetchFileContent')
    const search = vi.spyOn(files, 'searchFiles').mockResolvedValue(undefined)
    const write = vi.spyOn(files, 'saveFileContentFromEditor')
    const removeWindow = vi.spyOn(window, 'removeEventListener'), removeDocument = vi.spyOn(document, 'removeEventListener')
    const view = JSON.parse(JSON.stringify(taskBearingView()))
    view.is_active = false
    view.agent_statuses = []
    const team = view.execution_tree.rootOrg.members.find((member: any) => 'teamRunId' in member)
    team.defaultLaunchConfiguration.workspaceRootPath = '/workspace/C'
    team.members.forEach((agent: any) => { agent.launchConfiguration.workspaceRootPath = '/workspace/C' })
    let canonical = view.execution_tree
    let metadataAvailable = false
    const resolve = vi.spyOn(workspace, 'resolveWorkspaceMetadataByRootPath').mockImplementation(async root => {
      if (root === '/workspace/B' && !metadataAvailable) throw new Error('B metadata unavailable')
      return root ? metadata(root.split('/').at(-1)!) : null
    })
    io.query.mockImplementation(async ({ query, variables }: any) => {
      const name = query.definitions.find((entry: any) => entry.kind === 'OperationDefinition')?.name?.value
      if (name === 'AgentOrgRunConfig') return { data: { getAgentOrgRunConfig: { orgRunId: 'org-run', executionTree: canonical,
        isActive: false, editability: { editable: true, reason: null } } } }
      if (variables.agentRunId) return { data: { getAgentOrgMemberRunProjection: { ...variables,
        conversation: [], activities: [], hasEarlierActiveTraceEvents: false } } }
      if (name === 'GetFileContent') return { data: { fileContent: `editable-${variables.workspaceId}` } }
      return { data: { getAgentOrgRunInspection: { schema_version: 1, root_subject_kind: 'agent_org', root_run_id: 'org-run', root_org: view } } }
    })
    io.mutate.mockImplementation(async ({ variables }: any) => {
      if (!variables.input?.orgRunId) return { data: { writeFileContent: JSON.stringify({ changes: [] }) } }
      canonical = JSON.parse(JSON.stringify(canonical))
      const changed = canonical.rootOrg.members.find((member: any) => 'teamRunId' in member)
      changed.defaultLaunchConfiguration.workspaceRootPath = '/workspace/B'
      changed.members.forEach((agent: any) => { agent.launchConfiguration.workspaceRootPath = '/workspace/B' })
      return { data: { updateStoppedAgentOrgRunConfig: { success: true, outcome: 'UPDATED', message: 'Saved',
        isActive: false, editability: { editable: true, reason: null }, fieldErrors: [], canonical } } }
    })
    useRunActions().prepareAgentRun({ id: 'draft-def', name: 'Draft A' } as any)
    const draftStore = useAgentRunConfigStore()
    draftStore.setWorkspaceLoaded('A', '/workspace/A', metadata('A'))
    const retainedDraft = draftStore.config
    await files.openFile('A.txt', 'A')
    // The normal History action retains the unrelated launch draft.
    history.agentOrgHistory = [{ rootRunId: 'org-run', executionTree: view.execution_tree }] as any
    await useWorkspaceHistorySubjectActions().execute({ rootSubjectKind: 'agent_org', rootRunId: 'org-run',
      action: 'select', memberAddress: '/team/lead' })
    const orgStore = useAgentOrgContextsStore(), org = orgStore.contextFor('org-run')!
    const member = org.getAgentContext('agent-lead-configured')!
    member.requirement = 'retained composer'; member.contextFilePaths = [{ id: 'attachment', path: '/old/reference' }] as any
    const state = member.state, conversation = member.conversation, attachments = member.contextFilePaths
    expect(workspace.activeWorkspace?.workspaceId).toBe('A') // real fallback remains intentionally A
    await files.openFile('C.txt', 'C')
    useRightSideTabs().setActiveTab(previouslyMounted ? 'files' : 'progress')
    const wrapper = mountPanel(); await flush()
    if (previouslyMounted) { useRightSideTabs().setActiveTab('files'); await flush() }
    if (previouslyMounted) {
      expect(wrapper.getComponent(FileExplorer).props('workspaceId')).toBe('C')
      expect(wrapper.text()).toContain('editable-C')
      expect(acquire).toHaveBeenCalledWith('C', expect.any(String))
      await wrapper.getComponent(FileExplorer).find('input').setValue('pending search')
    } else expect(wrapper.findComponent(FileExplorer).exists()).toBe(false)
    const saved = await orgStore.saveRunConfig('org-run', { modelPatches: [],
      teamWorkspacePatches: [{ teamAddress: '/team', workspaceRootPath: '/workspace/B' }] })
    await flush()
    expect(saved.success).toBe(true)
    expect(org.index.requireAgent(member.state.runId).source.launchConfiguration.workspaceRootPath).toBe('/workspace/B')
    expect(member.config.workspaceId).toBeNull(); expect(member.config.workspaceMetadata).toBeNull()
    expect(member.state).toBe(state); expect(member.conversation).toBe(conversation)
    expect(member.contextFilePaths).toBe(attachments); expect(member.requirement).toBe('retained composer')
    expect(draftStore.config).toBe(retainedDraft); expect(draftStore.config?.workspaceId).toBe('A')
    if (previouslyMounted) {
      expect(released).toHaveBeenCalled()
      expect(removeWindow.mock.calls.some(call => call[0] === 'keydown')).toBe(true)
      expect(removeDocument.mock.calls.some(call => call[0] === 'dragover')).toBe(true)
    }
    acquire.mockClear(); readFile.mockClear(); search.mockClear(); write.mockClear()
    for (const tab of ['files', 'progress', 'files'] as const) {
      useRightSideTabs().setActiveTab(tab); await flush(); await pressSave()
      expect(wrapper.findComponent(FileExplorer).exists()).toBe(false)
      expect(wrapper.findComponent(FileExplorerTabs).exists()).toBe(false)
    }
    await new Promise(resolve => setTimeout(resolve, 550))
    expect(wrapper.get('[data-test="workspace-unavailable"]').text()).toContain('Workspace details are unavailable')
    expect(wrapper.text()).not.toContain('editable-A')
    expect(acquire).not.toHaveBeenCalled(); expect(readFile).not.toHaveBeenCalled()
    expect(search).not.toHaveBeenCalled(); expect(write).not.toHaveBeenCalled()
    // Canonical read retries B; it must not resend a committed Save.
    const saves = io.mutate.mock.calls.length
    metadataAvailable = true; register('B')
    await orgStore.readRunConfig('org-run'); await flush()
    expect(io.mutate).toHaveBeenCalledTimes(saves)
    expect(member.config.workspaceId).toBe('B'); expect(resolve).toHaveBeenCalledWith('/workspace/B')
    expect(wrapper.getComponent(FileExplorer).props('workspaceId')).toBe('B')
    expect(wrapper.getComponent(FileExplorerTabs).props('workspaceId')).toBe('B')
    await files.openFile('B.txt', 'B'); await flush(); await pressSave()
    expect(write).toHaveBeenCalledWith('B', 'B.txt', 'editable-B')
    expect(files.getSaveContentError('B.txt', 'B')).toBeNull()
    expect(draftStore.config).toBe(retainedDraft); expect(workspace.activeWorkspace?.workspaceId).toBe('A')
    expect(member.conversation).toBe(conversation)
    wrapper.unmount()
    // Omitted/unscoped layout still intentionally uses retained launch draft A.
    const control = mount(FileExplorerLayout, { global: { stubs: { FileViewer: EditorRenderer } } }); mounted.push(control)
    await flush(); expect(control.text()).toContain('editable-A')
    await pressSave(); expect(write).toHaveBeenCalledWith('A', 'A.txt', 'editable-A')
  })
}
