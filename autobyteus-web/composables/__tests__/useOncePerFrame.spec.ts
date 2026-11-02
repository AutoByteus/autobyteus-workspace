import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { useOncePerFrame } from '../useOncePerFrame'

// autobyteus-358 (REQ-005, DS-006): the conversation feed's scroll check reads layout at most once per frame.
describe('useOncePerFrame', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  const setup = () => {
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.push(callback); return frames.length })
    const check = vi.fn()
    let schedule!: () => void
    const wrapper = mount(defineComponent({ setup: () => { schedule = useOncePerFrame(check); return () => h('div') } }))
    const runFrame = () => frames.splice(0).forEach((callback) => callback(0))
    return { check, schedule: () => schedule(), runFrame, wrapper }
  }

  it('runs the check once per frame however often it is requested, after the frame', () => {
    const { check, schedule, runFrame } = setup()
    for (let update = 0; update < 50; update += 1) schedule()
    expect(check).not.toHaveBeenCalled()
    runFrame()
    expect(check).toHaveBeenCalledOnce()
    schedule(); schedule()
    runFrame()
    expect(check).toHaveBeenCalledTimes(2)
  })

  it('does nothing in a frame that comes after the component unmounted', () => {
    const { check, schedule, runFrame, wrapper } = setup()
    schedule()
    wrapper.unmount()
    runFrame()
    schedule()
    runFrame()
    expect(check).not.toHaveBeenCalled()
  })
})
