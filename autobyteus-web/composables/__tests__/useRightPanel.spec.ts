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
  it('clamps the actual width to the registered workspace while preserving the preferred width', async () => {
    const { useRightPanel } = await loadSubject()
    const panel = useRightPanel()

    panel.initDragRightPanel(new MouseEvent('mousedown', { clientX: 1000 }))
    dispatchMouseMove(0)
    dispatchMouseUp()

    expect(panel.rightPanelWidth.value).toBe(1450)
    expect(panel.preferredRightPanelWidth.value).toBe(1450)

    panel.setRightPanelWorkspaceWidth(1300)
    expect(panel.rightPanelWidth.value).toBe(816)

    panel.setRightPanelWorkspaceWidth(1700)
    expect(panel.rightPanelWidth.value).toBe(1216)
  })

  it('keeps the normal right-panel minimum while resizing when enough space is available', async () => {
    const { useRightPanel } = await loadSubject()
    const panel = useRightPanel()

    panel.setRightPanelWorkspaceWidth(1200)
    panel.initDragRightPanel(new MouseEvent('mousedown', { clientX: 500 }))
    dispatchMouseMove(1000)
    dispatchMouseUp()

    expect(panel.rightPanelWidth.value).toBe(400)
  })

  it('clamps drag updates at the available maximum instead of allowing an oversized preference', async () => {
    const { useRightPanel } = await loadSubject()
    const panel = useRightPanel()

    panel.setRightPanelWorkspaceWidth(1300)
    panel.initDragRightPanel(new MouseEvent('mousedown', { clientX: 1000 }))
    dispatchMouseMove(0)
    dispatchMouseUp()

    expect(panel.preferredRightPanelWidth.value).toBe(816)
    expect(panel.rightPanelWidth.value).toBe(816)
  })

  it('allows a temporary width below the normal minimum to preserve the center bound', async () => {
    const { useRightPanel } = await loadSubject()
    const panel = useRightPanel()

    panel.setRightPanelWorkspaceWidth(550)

    expect(panel.rightPanelWidth.value).toBe(66)
  })

  it('keeps visibility as a user preference separate from width', async () => {
    const { useRightPanel } = await loadSubject()
    const panel = useRightPanel()

    panel.setRightPanelVisible(false)

    expect(panel.isRightPanelVisible.value).toBe(false)
    expect(panel.rightPanelWidth.value).toBe(450)
  })
})
