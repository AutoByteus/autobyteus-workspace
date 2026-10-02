import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, reactive } from 'vue'
import { mount } from '@vue/test-utils'
import { useProjectNotice } from '../useProjectNotice'
const { replace } = vi.hoisted(() => ({replace: vi.fn()}))
let route: {path: string; query: Record<string, string>}
vi.mock('vue-router', () => ({useRoute: () => route, useRouter: () => ({replace})}))
describe('Project notice marker lifetime', () => {
  beforeEach(() => {vi.useFakeTimers(); replace.mockReset(); route = reactive({path: '/projects/p', query: {notice: 'saved', tab: 'workspaces'}})})
  afterEach(() => vi.useRealTimers())
  const setup = () => mount(defineComponent({setup() {const message = useProjectNotice({saved: 'Changes saved.'}); return () => message.value}}))
  it('expires at exactly 3000ms without dropping another query or stealing focus', async () => {
    const wrapper = setup(), active = document.activeElement
    expect(wrapper.text()).toBe('Changes saved.')
    await vi.advanceTimersByTimeAsync(2999)
    expect(replace).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(replace).toHaveBeenCalledWith({path: '/projects/p', query: {tab: 'workspaces'}})
    expect(document.activeElement).toBe(active)
    wrapper.unmount()
  })
  it('disposes its timer when leaving the page', async () => {
    const wrapper = setup()
    wrapper.unmount()
    await vi.advanceTimersByTimeAsync(3000)
    expect(replace).not.toHaveBeenCalled()
  })
})
