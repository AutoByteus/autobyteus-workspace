import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { reactive } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import UpdateChecksCard from '../UpdateChecksCard.vue'
import { useUpdateAutomationStore } from '~/stores/updateAutomationStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'
import type { UpdateAutomationSettings } from '~/types/updateNotifications'

/**
 * CR-001: GitHub's wait changes no record and no setting, so nothing announces it to the window. Opening the card
 * reads the node's current settings, also when the store resolved them earlier (REQ-004, AC-004, VIS-019).
 */
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn() }))
vi.mock('~/stores/capabilities/updateChecksCapabilityStore', () => ({
  useUpdateChecksCapabilityStore: () => reactive({ status: 'resolved', isEnabled: true, error: null, ensureResolved: vi.fn().mockResolvedValue(null) }),
}))

const settings = (githubWaitUntil: string | null): UpdateAutomationSettings => ({
  intervals: { agentPackages: 30, skillSources: 30, agentRuntimes: 60 },
  automaticUpdates: { agentPackages: false, skillSources: false, agentRuntimes: false },
  githubWaitUntil, desktopEmbeddedNode: true,
})

let wrapper: VueWrapper | null = null
let answer: UpdateAutomationSettings
const query = vi.fn(async () => ({ data: { updateAutomationSettings: structuredClone(answer) } }))

beforeEach(() => {
  setActivePinia(createPinia())
  vi.spyOn(useWindowNodeContextStore(), 'waitForBoundBackendReady').mockResolvedValue(true)
  vi.mocked(getApolloClient).mockReturnValue({ query, mutate: vi.fn() } as never)
  query.mockClear()
})
afterEach(() => { wrapper?.unmount(); wrapper = null })

describe('UpdateChecksCard GitHub wait on open (CR-001)', () => {
  it('shows a wait the node learned after the settings were first read', async () => {
    answer = settings(null)
    await useUpdateAutomationStore().ensureResolved()
    expect(useUpdateAutomationStore().resolved?.githubWaitUntil).toBeNull()

    // A later pass was throttled: the node now reports a wait, and nothing told this window.
    answer = settings(new Date(Date.now() + 20 * 60_000).toISOString())
    wrapper = mount(UpdateChecksCard, { global: { mocks: { $t: (key: string, params?: Record<string, string | number>) =>
      localizationRuntime.translate(key, params) } } })
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(2)
    expect(wrapper.get('[data-testid="update-checks-backoff"]').text()).toMatch(/^GitHub asked this node to wait until .+\.$/)
  })
})
