import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'

// D-17 (AR-010): the contextual default tab (Team members / Activity) is shared by Chat, Team and
// Org. It applies on mount or scope change only when the scope differs from the last one applied,
// and an explicit strip choice made while no tabs host is mounted wins at the next mount.
const target = ref<any>(null)
vi.mock('~/stores/activeContextStore', () => ({
  useActiveContextStore: () => ({ get activeWorkspaceTarget() { return target.value } }),
}))
vi.mock('~/stores/browserShellStore', () => ({ useBrowserShellStore: () => ({ browserAvailable: false }) }))

const teamTarget = (rootRunId = 'team-1') => ({
  kind: 'standalone_team_member', team: {},
  collaborationMessages: { rootKind: 'agent_team', rootRunId },
  context: { state: { runId: 'member-1' } },
})
const chatTarget = (runId = 'chat-1') => ({ kind: 'standalone_agent', context: { state: { runId } } })

const loadSubject = async () => {
  vi.resetModules()
  const { useRightSideTabs } = await import('../useRightSideTabs')
  let api!: ReturnType<typeof useRightSideTabs>
  const Host = defineComponent({ setup() { api = useRightSideTabs(); api.useContextualDefaultTab(); return () => h('div') } })
  const tabs = () => useRightSideTabsOutside(useRightSideTabs)
  return { Host, api: () => api, tabs }
}
// A caller outside any tabs host (e.g. the collapsed strip).
const useRightSideTabsOutside = <T,>(factory: () => T): T => {
  let result!: T
  mount(defineComponent({ setup() { result = factory(); return () => h('div') } }))
  return result
}

describe('useRightSideTabs contextual default (D-17)', () => {
  beforeEach(() => { target.value = null })

  it('Team (Team members) → a chat opens on Activity; a chat (Files) → Team opens on Team members', async () => {
    const { Host, api } = await loadSubject()
    target.value = teamTarget()
    const team = mount(Host)
    expect(api().activeTab.value).toBe('teamMembers')
    team.unmount()

    target.value = chatTarget()
    const chat = mount(Host)
    expect(api().activeTab.value).toBe('progress')
    api().selectTabExplicitly('files')
    chat.unmount()

    target.value = teamTarget()
    mount(Host)
    expect(api().activeTab.value).toBe('teamMembers')
  })

  it('opens exactly the tab clicked on the collapsed strip, for Chat and Team', async () => {
    for (const make of [chatTarget, teamTarget]) {
      const { Host, api, tabs } = await loadSubject()
      target.value = make()
      mount(Host).unmount()

      tabs().selectTabExplicitly('terminal')
      mount(Host)
      expect(api().activeTab.value).toBe('terminal')
    }
  })

  it('keeps the current tab when the same run is reopened, and re-defaults on a scope change', async () => {
    const { Host, api } = await loadSubject()
    target.value = chatTarget('chat-1')
    const first = mount(Host)
    api().setActiveTab('artifacts')
    first.unmount()
    mount(Host)
    expect(api().activeTab.value).toBe('artifacts')

    target.value = chatTarget('chat-2')
    await nextTick()
    expect(api().activeTab.value).toBe('progress')
  })

  it('treats Team and AgentOrg roots with the same run id as different scopes', async () => {
    const { Host, api } = await loadSubject()
    target.value = teamTarget('shared-run-id')
    mount(Host)
    api().setActiveTab('files')

    target.value = { ...teamTarget('shared-run-id'), kind: 'agent_org_direct_agent',
      collaborationMessages: { rootKind: 'agent_org', rootRunId: 'shared-run-id' } }
    await nextTick()
    expect(api().contextualScopeKey.value).toBe('agent_org:shared-run-id')
    expect(api().activeTab.value).toBe('teamMembers')
  })
})
