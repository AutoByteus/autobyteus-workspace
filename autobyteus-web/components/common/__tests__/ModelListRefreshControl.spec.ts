import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ModelListRefreshControl from '../ModelListRefreshControl.vue'

const mountControl = (props: { refreshing: boolean; failed: boolean }) =>
  mount(ModelListRefreshControl, { props, global: { mocks: { $t: (key: string) => key } } })

describe('ModelListRefreshControl (REQ-011, QR-001)', () => {
  it('offers "Refresh models" and asks for a refresh', async () => {
    const control = mountControl({ refreshing: false, failed: false })

    const button = control.get('[data-test="model-list-refresh-button"]')
    expect(button.text()).toBe('chat.model.refresh')
    expect((button.element as HTMLButtonElement).disabled).toBe(false)
    expect(control.find('[data-test="model-list-refreshing"]').exists()).toBe(false)
    await button.trigger('click')

    expect(control.emitted('refresh')).toHaveLength(1)
  })

  it('shows a busy state and cannot be pressed again while the list is read', async () => {
    const control = mountControl({ refreshing: true, failed: false })

    expect(control.get('[data-test="model-list-refreshing"]').attributes('role')).toBe('status')
    const button = control.get('[data-test="model-list-refresh-button"]')
    expect((button.element as HTMLButtonElement).disabled).toBe(true)
    await button.trigger('click')

    expect(control.emitted('refresh')).toBeUndefined()
  })

  it('shows the failure with Retry, which asks again', async () => {
    const control = mountControl({ refreshing: false, failed: true })

    expect(control.get('[data-test="model-list-refresh-error"]').attributes('role')).toBe('alert')
    const button = control.get('[data-test="model-list-refresh-button"]')
    expect(button.text()).toBe('chat.model.retry')
    await button.trigger('click')

    expect(control.emitted('refresh')).toHaveLength(1)
  })
})
