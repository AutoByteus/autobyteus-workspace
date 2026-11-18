// What this image provides to a server package: its Node module version, its architecture and its
// system level. A package fits when it needs exactly this Node module version and architecture and
// no higher system level (C3: the package's server-package.json).
import { readFileSync, statfsSync } from 'node:fs'

export function readSystemFacts(systemLevelFile) {
  const systemLevel = Number(readFileSync(systemLevelFile, 'utf8').trim())
  if (!Number.isInteger(systemLevel) || systemLevel < 1) throw new Error(`${systemLevelFile} holds no system level`)
  return { nodeModuleVersion: process.versions.modules, arch: process.arch, systemLevel }
}

/** Why a package does not fit this image, or null when it fits. */
export function misfitReason(packageJson, facts) {
  if (packageJson.arch !== facts.arch) return `it is built for ${packageJson.arch}, this image is ${facts.arch}`
  if (packageJson.nodeModuleVersion !== facts.nodeModuleVersion) {
    return `it needs Node module version ${packageJson.nodeModuleVersion}, this image has ${facts.nodeModuleVersion}`
  }
  if (!(packageJson.systemLevel <= facts.systemLevel)) {
    return `it needs system level ${packageJson.systemLevel}, this image provides ${facts.systemLevel}`
  }
  return null
}

/**
 * Whether `folder` is a mount of its own (a volume), from /proc/<pid>/mountinfo: field 5 of a line is
 * its mount point. Without its own volume, what the starter installs there lives in the container
 * layer and is lost when the container is recreated.
 */
export function isOwnMount(folder, mountinfoFile) {
  let mountinfo
  try {
    mountinfo = readFileSync(mountinfoFile, 'utf8')
  } catch {
    return false
  }
  return mountinfo.split('\n').some((line) => line.split(' ')[4] === folder)
}

/** Free bytes for an unprivileged writer on the file system holding `folder`. */
export function freeBytes(folder) {
  const { bavail, bsize } = statfsSync(folder)
  return bavail * bsize
}
