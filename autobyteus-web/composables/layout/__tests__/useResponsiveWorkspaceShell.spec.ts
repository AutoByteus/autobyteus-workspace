import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { useResponsiveWorkspaceShell } from '../useResponsiveWorkspaceShell'
import { useRightPanel } from '~/composables/useRightPanel'
import { useLeftPanel } from '~/composables/useLeftPanel'

const viewport = async (width: number, height = 800) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height })
  window.dispatchEvent(new Event('resize'))
  await nextTick()
}
const right = useRightPanel()
const left = useLeftPanel()
let wrapper: ReturnType<typeof mount> | undefined
const reset = () => {
  left.setLeftPanelVisible(true)
  left.leftPanelWidth.value = 320
  right.setRightPanelVisible(true)
  right.setRightPanelWorkspaceWidth(null)
  right.preferredRightPanelWidth.value = 450
  right.rightPanelResizeIntent.value = 'automatic'
}
beforeEach(async () => { reset(); await viewport(1440) })
afterEach(() => { wrapper?.unmount(); reset() })

const mountProvider = () => {
  let provider!: ReturnType<typeof useResponsiveWorkspaceShell>
  wrapper = mount(defineComponent({ setup() {
    provider = useResponsiveWorkspaceShell()
    return () => h('div')
  } }))
  return provider.responsiveWorkspaceShellState
}

describe('responsive shell composition', () => {
  it('uses retained raw preference, independent of stale measured effective width (AC-002/003)', async () => {
    left.setLeftPanelVisible(false)
    right.preferredRightPanelWidth.value = 1186
    right.rightPanelResizeIntent.value = 'user-sized'
    right.setRightPanelWorkspaceWidth(754) // old observation cannot dictate prospective capacity
    expect(right.rightPanelWidth.value).toBe(550)
    const shell = mountProvider()
    await nextTick()
    expect(shell.value.rightPanel.preferredWidth).toBe(1186)
    expect(shell.value.leftPanel.stripActivation).toBe('redock-panel')
    for (let cycle = 0; cycle < 3; cycle++) {
      left.setLeftPanelVisible(true)
      await nextTick()
      expect(shell.value.rightPanel.preferredWidth).toBe(910)
      right.setRightPanelWorkspaceWidth(1114)
      left.setLeftPanelVisible(false)
      await nextTick()
      expect(shell.value.rightPanel.preferredWidth).toBe(1186)
    }
    expect(right.preferredRightPanelWidth.value).toBe(1186)
    expect(right.rightPanelResizeIntent.value).toBe('user-sized')
  })

  it('re-evaluates capacity on viewport resize without rewriting preference/intent (AC-004/005)', async () => {
    right.preferredRightPanelWidth.value = 1186
    right.rightPanelResizeIntent.value = 'user-sized'
    const shell = mountProvider()
    await viewport(930)
    expect(shell.value.rightPanel.preferredWidth).toBe(400)
    await viewport(929)
    expect(shell.value.rightPanel.presentation).toBe('strip')
    await viewport(767)
    expect(shell.value.isNarrow).toBe(true)
    expect(shell.value.leftPanel.stripActivation).toBe('open-drawer')
    await viewport(1440, 480)
    expect(shell.value.isShortHeight).toBe(true)
    expect(shell.value.rightPanel.presentation).toBe('strip')
    await viewport(1440)
    expect(shell.value.rightPanel.preferredWidth).toBe(910)
    expect(right.preferredRightPanelWidth.value).toBe(1186)
    expect(right.rightPanelResizeIntent.value).toBe('user-sized')
  })

  it('allocates the automatic dock even when measured width is below its minimum', async () => {
    right.setRightPanelWorkspaceWidth(700)
    expect(right.rightPanelWidth.value).toBe(216)
    const shell = mountProvider()
    await viewport(1210)
    expect(shell.value.rightPanel.presentation).toBe('docked')
    expect(shell.value.rightPanel.preferredWidth).toBe(400)
    expect(shell.value.rightPanel.effectiveCenterMinWidth).toBe(480)
  })
})
