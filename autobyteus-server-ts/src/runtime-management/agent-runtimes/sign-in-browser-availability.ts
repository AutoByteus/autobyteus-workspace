/** The variables through which a Linux node's processes open a browser on its own desktop. */
const BROWSER_VARIABLES = ["BROWSER", "DISPLAY", "WAYLAND_DISPLAY"] as const;

/**
 * Whether a runtime's own login (`codex login`, `grok login --oauth`) started by this server can
 * open a browser on this node's own desktop. macOS and Windows always have one. On Linux the
 * login opens one only through `BROWSER` or a display; the AutoByteus server Docker image sets
 * `BROWSER` (its VNC Chromium) and `DISPLAY`. Without them the login only waits.
 */
export const isSignInBrowserAvailable = (platform: NodeJS.Platform, env: NodeJS.ProcessEnv): boolean =>
  platform === "darwin" || platform === "win32" || BROWSER_VARIABLES.some((name) => Boolean(env[name]));
