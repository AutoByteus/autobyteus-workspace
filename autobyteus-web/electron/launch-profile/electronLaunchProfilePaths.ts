import * as fs from 'fs'
import * as path from 'path'
import type { App } from 'electron'
import type { ElectronLaunchProfile, E2EElectronPathPlan } from './electronLaunchProfile'
import { getResolvedSafeE2EDataRootPath } from './e2eDataRootSafety'

function isContainedBy(rootPath: string, candidatePath: string): boolean {
  const relative = path.relative(rootPath, candidatePath)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

function samePath(leftPath: string, rightPath: string): boolean {
  const left = path.normalize(leftPath)
  const right = path.normalize(rightPath)
  return process.platform === 'win32'
    ? left.toLowerCase() === right.toLowerCase()
    : left === right
}

function ensureManagedDirectory(rootPath: string, directoryPath: string): void {
  const relativePath = path.relative(rootPath, directoryPath)
  if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(`Managed Electron path is outside the authorized E2E root: ${directoryPath}`)
  }

  let currentPath = rootPath
  for (const segment of relativePath.split(path.sep).filter(Boolean)) {
    currentPath = path.join(currentPath, segment)
    try {
      const entry = fs.lstatSync(currentPath)
      if (entry.isSymbolicLink()) {
        throw new Error(`Managed Electron path must not be a symbolic link: ${currentPath}`)
      }
      if (!entry.isDirectory()) {
        throw new Error(`Managed Electron path must be a directory: ${currentPath}`)
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
      fs.mkdirSync(currentPath, { mode: 0o700 })
    }

    const canonicalCurrentPath = fs.realpathSync(currentPath)
    if (!isContainedBy(rootPath, canonicalCurrentPath)) {
      throw new Error(`Managed Electron path escaped the authorized E2E root: ${currentPath}`)
    }
  }
}

export function applyElectronLaunchProfilePaths(
  app: Pick<App, 'setPath' | 'setAppLogsPath'>,
  profile: ElectronLaunchProfile,
): E2EElectronPathPlan | null {
  if (profile.name === 'production') {
    return null
  }

  const rootPath = getResolvedSafeE2EDataRootPath(profile.safeDataRoot)
  const rootEntry = fs.lstatSync(rootPath)
  if (rootEntry.isSymbolicLink() || !rootEntry.isDirectory()) {
    throw new Error(`Authorized E2E data root changed before path application: ${rootPath}`)
  }
  if (!samePath(fs.realpathSync(rootPath), rootPath)) {
    throw new Error(`Authorized E2E data root is no longer canonical: ${rootPath}`)
  }
  for (const managedDirectory of new Set(Object.values(profile.paths))) {
    if (managedDirectory !== rootPath) {
      ensureManagedDirectory(rootPath, managedDirectory)
    }
  }

  app.setPath('userData', profile.paths.userData)
  app.setPath('sessionData', profile.paths.sessionData)
  app.setPath('crashDumps', profile.paths.crashDumps)
  app.setPath('downloads', profile.paths.downloads)
  app.setAppLogsPath(profile.paths.logs)
  return profile.paths
}
