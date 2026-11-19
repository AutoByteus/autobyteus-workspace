import { closeSync, fstatSync, writeSync } from 'node:fs'

import { dirname, join } from 'node:path'

/** Called only after canonical managed context verification. FD4 is fixed; never an env/argv selector. */
export function claimManagedRestart(): (() => void) | null {
  const fd = 4
  const inode = process.env.AUTOBYTEUS_RESTART_INODE
  delete process.env.AUTOBYTEUS_RESTART_INODE
  if (!inode) return null
  try {
    const stat = fstatSync(fd)
    if (!stat.isSocket() || inode !== String(stat.ino)) return null
    // Node has no fcntl API. Claim and set FD_CLOEXEC before any server/client spawn.
    const claim: () => boolean = require(join(dirname(process.execPath), 'managed-restart.node'))
    if (!claim()) return null
    let sent = false
    return () => {
      if (sent) throw new Error('Manual restart channel already consumed')
      sent = true
      try {
        if (writeSync(fd, 'R') !== 1) throw new Error('Incomplete manual restart indication')
      } finally { closeSync(fd) }
    }
  } catch { return null }
}
