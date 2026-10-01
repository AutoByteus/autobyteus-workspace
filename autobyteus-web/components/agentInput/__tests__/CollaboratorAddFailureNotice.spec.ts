import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import CollaboratorAddFailureNotice from '../CollaboratorAddFailureNotice.vue'

const mocks = vi.hoisted(() => ({ target: null as any }))
vi.mock('~/stores/activeContextStore', () => ({ useActiveContextStore: () => ({ get activeWorkspaceTarget() { return mocks.target } }) }))

const mountNotice = () => mount(CollaboratorAddFailureNotice, {
  global: { mocks: { $t: (key: string, params?: Record<string, string>) => `${key}:${JSON.stringify(params ?? {})}` } },
})

describe('CollaboratorAddFailureNotice (VIS-007)', () => {
  it('shows the rejected send of the focused conversation as an alert and dismisses it', async () => {
    const context = reactive({ collaboratorAddFailure: { name: 'Marketing Team', reason: 'Its model is not available.' } })
    mocks.target = { context }
    const wrapper = mountNotice()
    const alert = wrapper.get('[data-test="collaborator-add-failure"]')
    expect(alert.attributes('role')).toBe('alert')
    expect(alert.text()).toContain('"name":"Marketing Team"')
    expect(alert.text()).toContain('"reason":"Its model is not available."')
    await wrapper.get('[data-test="collaborator-add-failure-dismiss"]').trigger('click')
    expect(context.collaboratorAddFailure).toBeNull()
    expect(wrapper.find('[data-test="collaborator-add-failure"]').exists()).toBe(false)
  })

  it('shows nothing on success (the run tree is the signal)', () => {
    mocks.target = { context: reactive({ collaboratorAddFailure: null }) }
    expect(mountNotice().find('[data-test="collaborator-add-failures"]').exists()).toBe(false)
  })
})
