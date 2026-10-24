/**
 * DEC-020: whether this window is its bound node's own window, the desktop's window of its embedded
 * node. Settings → Agent Runtimes, the Notification Center and the Update checks card share this one
 * rule. Agent runtime updates additionally need the node itself to report that it is the desktop's
 * embedded node (`desktopEmbeddedNode`, AR-005).
 */
export const isOwnNodeWindow = (windowNode: { isEmbeddedWindow: boolean }): boolean => windowNode.isEmbeddedWindow

/** The runtime category, switch, interval and contact line show only here (REQ-020, AC-022). */
export const showsAgentRuntimeUpdates = (
  windowNode: { isEmbeddedWindow: boolean },
  settings: { desktopEmbeddedNode: boolean } | null,
): boolean => isOwnNodeWindow(windowNode) && settings?.desktopEmbeddedNode === true
