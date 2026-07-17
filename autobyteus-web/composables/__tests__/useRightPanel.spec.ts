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

    panel.setRightPanelWorkspaceWidth(1300)
    expect(panel.rightPanelResizeIntent.value).toBe('automatic')
    expect(panel.rightPanelWidth.value).toBe(450)

    panel.initDragRightPanel(new MouseEvent('mousedown', { clientX: 1000 }))
    dispatchMouseMove(0)
    dispatchMouseUp()

    expect(panel.rightPanelResizeIntent.value).toBe('user-sized')
    expect(panel.rightPanelWidth.value).toBe(1096)
    expect(panel.preferredRightPanelWidth.value).toBe(1096)

    panel.setRightPanelWorkspaceWidth(1300)
    expect(panel.rightPanelWidth.value).toBe(1096)

    panel.setRightPanelWorkspaceWidth(1700)
    expect(panel.rightPanelWidth.value).toBe(1096)
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

  it('clamps explicit user-sized drag updates at the compact-floor maximum', async () => {
    const { useRightPanel } = await loadSubject()
    const panel = useRightPanel()

    panel.setRightPanelWorkspaceWidth(1300)
    panel.initDragRightPanel(new MouseEvent('mousedown', { clientX: 1000 }))
    dispatchMouseMove(0)
    dispatchMouseUp()

    expect(panel.rightPanelResizeIntent.value).toBe('user-sized')
    expect(panel.preferredRightPanelWidth.value).toBe(1096)
    expect(panel.rightPanelWidth.value).toBe(1096)
  })

  it('allows an automatic width below the normal minimum to preserve the automatic center bound', async () => {
    const { useRightPanel } = await loadSubject()
    const panel = useRightPanel()

    panel.setRightPanelWorkspaceWidth(550)

    expect(panel.rightPanelWidth.value).toBe(66)
  })

  it('uses the compact center floor after an explicit drag even below the normal minimum', async () => {
    const { useRightPanel } = await loadSubject()
    const panel = useRightPanel()

    panel.setRightPanelWorkspaceWidth(550)
    panel.initDragRightPanel(new MouseEvent('mousedown', { clientX: 500 }))
    dispatchMouseMove(0)
    dispatchMouseUp()

    expect(panel.rightPanelResizeIntent.value).toBe('user-sized')
    expect(panel.rightPanelWidth.value).toBe(346)
  })

  it('retains user-sized intent while the measured container shrinks and recovers', async () => {
    const { useRightPanel } = await loadSubject()
    const panel = useRightPanel()

    panel.setRightPanelWorkspaceWidth(1300)
    panel.initDragRightPanel(new MouseEvent('mousedown', { clientX: 1000 }))
    dispatchMouseMove(0)
    dispatchMouseUp()

    panel.setRightPanelWorkspaceWidth(800)
    expect(panel.rightPanelResizeIntent.value).toBe('user-sized')
    expect(panel.rightPanelWidth.value).toBe(596)

    panel.setRightPanelWorkspaceWidth(1300)
    expect(panel.rightPanelResizeIntent.value).toBe('user-sized')
    expect(panel.rightPanelWidth.value).toBe(1096)
  })

  it('keeps visibility as a user preference separate from width', async () => {
    const { useRightPanel } = await loadSubject()
    const panel = useRightPanel()

    panel.setRightPanelVisible(false)

    expect(panel.isRightPanelVisible.value).toBe(false)
    expect(panel.rightPanelWidth.value).toBe(450)
  })
})
