// Vitest runs this once, in its main process, before any test worker starts (autobyteus-318, T-06).
// The `electron` package has no install script: its first `require` downloads the Electron binary when
// node_modules/electron/dist is missing (a fresh clone). Requiring it here downloads it once, so parallel
// workers find the binary instead of racing the same download.
import { createRequire } from 'node:module'

export default function setup(): void {
  createRequire(import.meta.url)('electron')
}
