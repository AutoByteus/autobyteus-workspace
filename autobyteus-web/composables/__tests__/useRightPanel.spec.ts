import { describe, expect, it, vi } from 'vitest'

const loadSubject = async () => {
  vi.resetModules()
  return import('../useRightPanel')
}

const dispatchMouseMove = (clientX: number): void => {
  document.dispatchEvent(new MouseEvent('mousemove', { clientX }))
}

const dispatchMouseUp = (): void => {
  document.dispatchEvent(new MouseEvent('mouseup'))
}

describe('useRightPanel', () => {
  it('clamps actual width to the registered workspace while preserving preferred width for restoration', async () => {
    const { useRightPanel } = await loadSubject()
    const panel = useRightPanel()

    panel.initDragRightPanel(new MouseEvent('mousedown', { clientX: 1000 }))
    dispatchMouseMove(0)
    dispatchMouseUp()

    expect(panel.rightPanelWidth.value).toBe(1450)

    panel.setRightPanelWorkspaceWidth(1300)
    expect(panel.rightPanelWidth.value).toBe(1096)

    panel.setRightPanelWorkspaceWidth(1700)
    expect(panel.rightPanelWidth.value).toBe(1450)
  })

  it('keeps the normal right panel minimum when enough workspace width is available', async () => {
    const { useRightPanel } = await loadSubject()
    const panel = useRightPanel()

    panel.setRightPanelWorkspaceWidth(1200)
    panel.initDragRightPanel(new MouseEvent('mousedown', { clientX: 500 }))
    dispatchMouseMove(1000)
    dispatchMouseUp()

    expect(panel.rightPanelWidth.value).toBe(400)
  })

  it('allows temporary width below the normal minimum when that is required to keep the splitter visible', async () => {
    const { useRightPanel } = await loadSubject()
    const panel = useRightPanel()

    panel.setRightPanelWorkspaceWidth(550)

    expect(panel.rightPanelWidth.value).toBe(346)
  })
})
