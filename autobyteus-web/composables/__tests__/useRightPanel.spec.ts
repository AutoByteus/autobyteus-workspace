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
  it('owns the preferred width independently from responsive presentation', async () => {
    const { useRightPanel } = await loadSubject()
    const panel = useRightPanel()

    panel.initDragRightPanel(new MouseEvent('mousedown', { clientX: 1000 }))
    dispatchMouseMove(0)
    dispatchMouseUp()

    expect(panel.rightPanelWidth.value).toBe(1450)
    expect(panel.preferredRightPanelWidth.value).toBe(1450)
  })

  it('keeps the normal right-panel minimum while resizing', async () => {
    const { useRightPanel } = await loadSubject()
    const panel = useRightPanel()

    panel.initDragRightPanel(new MouseEvent('mousedown', { clientX: 500 }))
    dispatchMouseMove(1000)
    dispatchMouseUp()

    expect(panel.rightPanelWidth.value).toBe(400)
  })

  it('keeps visibility as a user preference separate from width', async () => {
    const { useRightPanel } = await loadSubject()
    const panel = useRightPanel()

    panel.setRightPanelVisible(false)

    expect(panel.isRightPanelVisible.value).toBe(false)
    expect(panel.rightPanelWidth.value).toBe(450)
  })
})
