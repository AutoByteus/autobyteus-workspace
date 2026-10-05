import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import RunConfigPanel from '../RunConfigPanel.vue'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useExistingRunConfigStore } from '~/stores/existingRunConfigStore'
import { useWorkspaceCenterViewStore } from '~/stores/workspaceCenterViewStore'

// The panel is only the chrome around a selected saved run's settings (Edit Config). New runs
// start in New chat and on the Org launch page; the old launch forms and the pending-launch and
// `temp-*` draft branches are gone (REQ-018, AR-003).
const mountPanel = () => mount(RunConfigPanel, {
  global: {
    stubs: { ExistingRunConfigEditor: { name: 'ExistingRunConfigEditor', template: '<div data-test="existing-editor" />' } },
    mocks: { $t: (key: string) => key },
  },
})

describe('RunConfigPanel', () => {
  beforeEach(() => { setActivePinia(createPinia()) })

  it('shows the selected saved run’s settings with no Run button or launch form', () => {
    useAgentSelectionStore().selectRun('run-1', 'agent')
    const wrapper = mountPanel()
    expect(wrapper.find('[data-test="existing-editor"]').exists()).toBe(true)
    expect(wrapper.find('.run-btn').exists()).toBe(false)
  })

  it('Back clears the saved-run draft and returns to the conversation', async () => {
    useAgentSelectionStore().selectRun('team-1', 'team')
    const center = useWorkspaceCenterViewStore()
    center.showConfig()
    const clear = vi.spyOn(useExistingRunConfigStore(), 'clear')
    const wrapper = mountPanel()

    await wrapper.get('[data-test="run-config-back-to-events"]').trigger('click')
    expect(clear).toHaveBeenCalled()
    expect(center.isConfigMode).toBe(false)
  })
})
