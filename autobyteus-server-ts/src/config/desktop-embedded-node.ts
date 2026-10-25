/** Set to `1` by the desktop shell for the server it starts as the desktop's own node (also for isolated instances). */
export const DESKTOP_EMBEDDED_NODE_ENV = "AUTOBYTEUS_DESKTOP_EMBEDDED_NODE";

let embedded: boolean | null = null;

/**
 * Whether this server is the desktop's embedded node. Docker and standalone servers never are.
 * Read once from the environment the shell set.
 */
export const isDesktopEmbeddedNode = (): boolean => embedded ??= process.env[DESKTOP_EMBEDDED_NODE_ENV] === "1";

export const resetDesktopEmbeddedNodeForTests = (): void => { embedded = null; };
