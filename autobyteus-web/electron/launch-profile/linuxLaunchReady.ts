import { closeSync, writeSync } from 'node:fs'

/** Pre-main sandbox detection ends once Electron reaches application bootstrap. */
export function signalLinuxLaunchReady(): void {
  const descriptor = process.env.AUTOBYTEUS_LAUNCH_READY_FD
  delete process.env.AUTOBYTEUS_LAUNCH_READY_FD
  if (process.platform !== 'linux' || descriptor !== '3') return
  try { writeSync(3, '1') } finally { closeSync(3) }
}
