import { ref } from 'vue'

/**
 * Rows that leave a Workspaces tree (their Task is DONE) fade out through `<TransitionGroup
 * name="tree-row">` (see `treeRowLeave.css`). A leaving row leaves the accessibility tree and
 * becomes inert at once; if it had keyboard focus, focus moves to the run row above the tree.
 */
export const useLeavingTreeRows = (runRowOf: (tree: HTMLElement) => HTMLElement | null) => {
  /** Rows still fading out: the tree stays rendered until they are gone. */
  const leaving = ref(0)
  const onBeforeLeave = (element: Element): void => {
    leaving.value += 1
    const row = element as HTMLElement
    const hadFocus = row.contains(document.activeElement)
    row.setAttribute('aria-hidden', 'true')
    row.inert = true
    if (!hadFocus) return
    const tree = row.closest<HTMLElement>('[role="tree"]')
    if (tree) runRowOf(tree)?.focus()
  }
  /** For `@after-leave` and `@leave-cancelled`. */
  const onLeaveSettled = (): void => { leaving.value -= 1 }
  return { leaving, onBeforeLeave, onLeaveSettled }
}
