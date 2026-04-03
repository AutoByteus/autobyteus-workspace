import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useRightSideTabs } from '../useRightSideTabs'
import { useBrowserShellStore } from '~/stores/browserShellStore'

vi.mock('~/stores/agentSelectionStore', () => ({
  useAgentSelectionStore: () => ({
    selectedType: 'agent',
  }),
}))

describe('useRightSideTabs', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('keeps Browser visible when the desktop Browser shell is available but no tabs exist', () => {
    const browserShellStore = useBrowserShellStore()
    browserShellStore.browserAvailable = true
    browserShellStore.sessions = []
    browserShellStore.activeTabId = null

    const { visibleTabs } = useRightSideTabs()

    expect(visibleTabs.value.some((tab) => tab.name === 'browser')).toBe(true)
  })
})
