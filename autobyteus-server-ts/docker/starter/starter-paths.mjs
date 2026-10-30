// Where the starter finds the image's parts and keeps its own state, and its time limits.
// The starter is the only reader and writer of the server-packages folder (a per-node volume).
export const STARTER_PATHS = Object.freeze({
  /** The image's built-in server package. */
  builtInPackage: '/opt/autobyteus/server-package',
  /** The image's system level: one whole number. */
  systemLevelFile: '/opt/autobyteus/system-level',
  /** state.json, update.json, packages/<version>/, downloads/, data-copy/ (volume <node>-server-packages). */
  packagesRoot: '/home/autobyteus/server-packages',
  /** The starter's local HTTP socket (C2), readable by root only. */
  socket: '/run/autobyteus/starter.sock',
})

export const STARTER_LIMITS = Object.freeze({
  /** How long a server gets to exit after SIGTERM before its process group is killed. */
  stopMs: 120_000,
  /** How long a start waits for the server port to be free (a previous server's leftovers). */
  portFreeMs: 30_000,
})
