// Where the starter finds the image's parts and keeps its own state, and its time and space limits.
// The starter is the only reader and writer of the server-packages folder (a per-node volume).
export const STARTER_PATHS = Object.freeze({
  /** The image's built-in server package. */
  builtInPackage: '/opt/autobyteus/server-package',
  /** The image's system level: one whole number. */
  systemLevelFile: '/opt/autobyteus/system-level',
  /** The Ed25519 public key server package descriptions are signed for (C3). */
  publicKey: '/opt/autobyteus/starter/server-package-signing-key.pem',
  /** state.json, update.json, packages/<version>/, downloads/, data-copy/ (volume <node>-server-packages). */
  packagesRoot: '/home/autobyteus/server-packages',
  /** The starter's local HTTP socket (C2), readable by root only. */
  socket: '/run/autobyteus/starter.sock',
  /** This process's mounts, to check that packagesRoot is its own volume. */
  mountinfo: '/proc/self/mountinfo',
})

/**
 * Where releases are downloaded from: GitHub release assets, the `latest` redirect and the release
 * feed, none of which use the GitHub API quota. AUTOBYTEUS_SERVER_PACKAGE_SOURCE replaces it in test
 * containers only (a local source; such images carry a test public key, so nothing else verifies).
 */
export const RELEASE_SOURCE_BASE = 'https://github.com/AutoByteus/autobyteus-workspace/releases'

export const STARTER_LIMITS = Object.freeze({
  /** How long a server gets to exit after SIGTERM before its process group is killed. */
  stopMs: 120_000,
  /** How long a start waits for the server port to be free (a previous server's leftovers). */
  portFreeMs: 30_000,
  /** How long a self-check candidate gets to answer its health check. */
  selfCheckMs: 120_000,
  /** How long the new server gets to answer its health check after the switch. */
  confirmHealthMs: 180_000,
  /** How long the new server must then stay up before the update is confirmed. */
  confirmAliveMs: 60_000,
  /** Free space kept beyond what an update needs, on the server-packages volume. */
  spareBytes: 512 * 1024 * 1024,
})
