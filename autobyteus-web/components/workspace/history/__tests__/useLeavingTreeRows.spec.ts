import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { useLeavingTreeRows } from '../useLeavingTreeRows'

/** task-run-resources-workspace-cleanup REQ-002/REQ-009: how a row leaves the Workspaces tree. */
const mountTree = () => {
  const host = document.createElement('div')
  host.innerHTML = `
    <button data-test="run-row">Manager run</button>
    <div role="tree">
      <div role="treeitem" tabindex="0" data-test="leaving"><span tabindex="0" data-test="inner">worker</span></div>
      <div role="treeitem" tabindex="0" data-test="staying">other</div>
    </div>`
  document.body.append(host)
  const get = (test: string) => host.querySelector<HTMLElement>(`[data-test="${test}"]`)!
  return { host, get }
}

describe('useLeavingTreeRows', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('takes a leaving row out of the accessibility tree at once and makes it inert', () => {
    const { get } = mountTree()
    const { leaving, onBeforeLeave, onLeaveSettled } = useLeavingTreeRows((tree) => tree.previousElementSibling as HTMLElement)
    onBeforeLeave(get('leaving'))
    expect(get('leaving').getAttribute('aria-hidden')).toBe('true')
    expect(get('leaving').inert).toBe(true)
    expect(leaving.value).toBe(1)
    onLeaveSettled()
    expect(leaving.value).toBe(0)
  })

  it('moves keyboard focus from a leaving row (or inside it) to the run row; other focus stays', () => {
    const { get } = mountTree()
    const { onBeforeLeave } = useLeavingTreeRows((tree) => tree.previousElementSibling as HTMLElement)
    get('inner').focus()
    onBeforeLeave(get('leaving'))
    expect(document.activeElement).toBe(get('run-row'))
    get('staying').focus()
    const second = mountTree()
    onBeforeLeave(second.get('leaving'))
    expect(document.activeElement).toBe(get('staying'))
  })

  it('leaves in 200 ms ease-out (fade, height and margin) and removes rows at once under reduced motion', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../treeRowLeave.css'), 'utf8').replace(/\s+/g, ' ')
    expect(css).toContain('.tree-row-leave-active { overflow: hidden; transition: opacity 200ms ease-out, max-height 200ms ease-out, margin-top 200ms ease-out, transform 200ms ease-out; }')
    expect(css).toContain('.tree-row-leave-to { opacity: 0; max-height: 0; min-height: 0; margin-top: 0 !important; }')
    expect(css).toContain('.tree-row-move { transition: transform 200ms ease-out; }')
    expect(css).toContain('@media (prefers-reduced-motion: reduce) { .tree-row-leave-active, .tree-row-move { transition: none; } }')
    expect(css).not.toContain('enter-active')
  })

  it('still fades and collapses a leaving row that carries the move class (CR-002)', () => {
    const style = document.createElement('style')
    // The media query does not match here; the cascade of the remaining rules is what a browser applies.
    style.textContent = fs.readFileSync(path.resolve(__dirname, '../treeRowLeave.css'), 'utf8')
    document.head.append(style)
    const row = document.createElement('div')
    row.className = 'tree-row-move tree-row-leave-active tree-row-leave-to'
    document.body.append(row)
    try {
      const transition = getComputedStyle(row).transition
      for (const property of ['opacity', 'max-height', 'margin-top', 'transform']) expect(transition).toContain(`${property} 200ms ease-out`)
      const moving = document.createElement('div')
      moving.className = 'tree-row-move'
      document.body.append(moving)
      expect(getComputedStyle(moving).transition).toBe('transform 200ms ease-out')
    } finally {
      style.remove()
    }
  })
})
