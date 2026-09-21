import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useRightSideTabs } from '../useRightSideTabs'
import { useBrowserShellStore } from '~/stores/browserShellStore'

const state = vi.hoisted(() => ({ activeWorkspaceTarget: null as any }))
vi.mock('~/stores/activeContextStore', () => ({
  useActiveContextStore: () => ({
    get activeWorkspaceTarget() { return state.activeWorkspaceTarget },
  }),
}))

describe('useRightSideTabs', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    state.activeWorkspaceTarget = null
  })

  it('keeps Browser visible when the desktop Browser shell is available but no tabs exist', () => {
    const browserShellStore = useBrowserShellStore()
    browserShellStore.browserAvailable = true
    browserShellStore.sessions = []
    browserShellStore.activeTabId = null

    const { visibleTabs } = useRightSideTabs()

    expect(visibleTabs.value.some((tab) => tab.name === 'browser')).toBe(true)
  })

  it('keeps the internal usage tab id while exposing Token as the user-visible label', () => {
    const { visibleTabs } = useRightSideTabs()

    expect(visibleTabs.value.find((tab) => tab.name === 'usage')).toMatchObject({
      name: 'usage',
      label: 'Token',
    })
  })

  it('gates the contextual slot on the message facet and labels AgentOrg access truthfully', () => {
    state.activeWorkspaceTarget = {
      kind: 'agent_org_direct_agent',
      collaborationMessages: { rootKind: 'agent_org' },
    }

    const { visibleTabs } = useRightSideTabs()

    expect(visibleTabs.value.find((tab) => tab.name === 'teamMembers')).toMatchObject({
      label: 'Org',
      ariaLabel: 'Agent Org',
    })
  })
})
