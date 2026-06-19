import * as path from 'path'

export type EntitlementProfileId =
  | 'root-app'
  | 'helper-generic'
  | 'helper-renderer'
  | 'helper-gpu'
  | 'helper-plugin'
  | 'none'

export type MacSigningSubjectKind =
  | 'root-app'
  | 'electron-helper-app'
  | 'non-app-nested-code'
  | 'ignored-non-code'

export type MacSigningTargetKind =
  | 'app-bundle'
  | 'app-main-executable'
  | 'framework-bundle'
  | 'xpc-bundle'
  | 'macho-file'
  | 'unknown'

export interface EntitlementProfile {
  id: EntitlementProfileId
  fileName?: string
  mayHaveEntitlementKeys: boolean
  description: string
}

export interface MacSigningSubject {
  path: string
  relativePath: string
  kind: MacSigningSubjectKind
  signingTargetKind: MacSigningTargetKind
  entitlementProfile: EntitlementProfileId
  mayHaveEntitlementKeys: boolean
  reason: string
}

export const ENTITLEMENT_PROFILES: Record<EntitlementProfileId, EntitlementProfile> = {
  'root-app': {
    id: 'root-app',
    fileName: 'entitlements.mac.plist',
    mayHaveEntitlementKeys: true,
    description: 'Top-level AutoByteus app entitlement profile',
  },
  'helper-generic': {
    id: 'helper-generic',
    fileName: 'entitlements.mac.helper.plist',
    mayHaveEntitlementKeys: true,
    description: 'Generic Electron helper runtime entitlements',
  },
  'helper-renderer': {
    id: 'helper-renderer',
    fileName: 'entitlements.mac.helper.renderer.plist',
    mayHaveEntitlementKeys: true,
    description: 'Electron renderer helper runtime entitlements',
  },
  'helper-gpu': {
    id: 'helper-gpu',
    fileName: 'entitlements.mac.helper.gpu.plist',
    mayHaveEntitlementKeys: true,
    description: 'Electron GPU helper runtime entitlements',
  },
  'helper-plugin': {
    id: 'helper-plugin',
    fileName: 'entitlements.mac.helper.plugin.plist',
    mayHaveEntitlementKeys: true,
    description: 'Electron plugin helper runtime entitlements',
  },
  none: {
    id: 'none',
    mayHaveEntitlementKeys: false,
    description: 'Hardened-runtime code signing without entitlement payload',
  },
}


export function getEntitlementProfile(profileId: EntitlementProfileId): EntitlementProfile {
  return ENTITLEMENT_PROFILES[profileId]
}

export function resolveEntitlementsFile(
  profileId: EntitlementProfileId,
  projectRoot: string = process.cwd()
): string | undefined {
  const fileName = ENTITLEMENT_PROFILES[profileId].fileName
  return fileName ? path.join(projectRoot, 'build', fileName) : undefined
}

export function classifyMacSigningSubject(appRoot: string, subjectPath: string): MacSigningSubject {
  const normalizedAppRoot = path.resolve(appRoot)
  const normalizedSubjectPath = path.resolve(subjectPath)
  const relativePath = toPolicyRelativePath(normalizedAppRoot, normalizedSubjectPath)
  const signingTargetKind = detectSigningTargetKind(normalizedSubjectPath)

  if (normalizedSubjectPath === normalizedAppRoot || isRootAppMainExecutable(normalizedAppRoot, normalizedSubjectPath)) {
    return buildSubject(normalizedSubjectPath, relativePath, 'root-app', signingTargetKind, 'root-app', 'top-level app signing subject')
  }

  const helperApp = findContainingElectronHelperApp(normalizedAppRoot, normalizedSubjectPath)
  if (helperApp && (normalizedSubjectPath === helperApp || isMainExecutableInsideApp(helperApp, normalizedSubjectPath))) {
    const profile = helperProfileForAppName(path.basename(helperApp, '.app'))
    return buildSubject(
      normalizedSubjectPath,
      relativePath,
      'electron-helper-app',
      signingTargetKind,
      profile,
      'Electron helper app bundle or helper main executable'
    )
  }

  return buildSubject(
    normalizedSubjectPath,
    relativePath,
    'non-app-nested-code',
    signingTargetKind,
    'none',
    'non-app nested code must be signed without entitlement payload'
  )
}

export function mandatoryUpdaterPaths(appRoot: string): { name: 'Squirrel' | 'ShipIt', path: string }[] {
  const squirrelFramework = path.join(appRoot, 'Contents', 'Frameworks', 'Squirrel.framework', 'Versions', 'A')
  return [
    { name: 'Squirrel', path: path.join(squirrelFramework, 'Squirrel') },
    { name: 'ShipIt', path: path.join(squirrelFramework, 'Resources', 'ShipIt') },
  ]
}

export function toPolicyRelativePath(appRoot: string, subjectPath: string): string {
  const relative = path.relative(path.resolve(appRoot), path.resolve(subjectPath))
  return relative === '' ? path.basename(appRoot) : relative.split(path.sep).join('/')
}

function buildSubject(
  subjectPath: string,
  relativePath: string,
  kind: MacSigningSubjectKind,
  signingTargetKind: MacSigningTargetKind,
  entitlementProfile: EntitlementProfileId,
  reason: string
): MacSigningSubject {
  return {
    path: subjectPath,
    relativePath,
    kind,
    signingTargetKind,
    entitlementProfile,
    mayHaveEntitlementKeys: ENTITLEMENT_PROFILES[entitlementProfile].mayHaveEntitlementKeys,
    reason,
  }
}

function detectSigningTargetKind(subjectPath: string): MacSigningTargetKind {
  if (subjectPath.endsWith('.app')) return 'app-bundle'
  if (subjectPath.endsWith('.framework')) return 'framework-bundle'
  if (subjectPath.endsWith('.xpc')) return 'xpc-bundle'
  if (isAppMainExecutablePath(subjectPath)) return 'app-main-executable'
  return 'macho-file'
}

function isRootAppMainExecutable(appRoot: string, subjectPath: string): boolean {
  return subjectPath === path.join(appRoot, 'Contents', 'MacOS', path.basename(appRoot, '.app'))
}

function isMainExecutableInsideApp(appBundlePath: string, subjectPath: string): boolean {
  return subjectPath === path.join(appBundlePath, 'Contents', 'MacOS', path.basename(appBundlePath, '.app'))
}

function isAppMainExecutablePath(subjectPath: string): boolean {
  const segments = subjectPath.split(path.sep)
  return segments.length >= 4 && segments[segments.length - 2] === 'MacOS' && segments[segments.length - 3] === 'Contents'
}

function findContainingElectronHelperApp(appRoot: string, subjectPath: string): string | null {
  const relative = path.relative(appRoot, subjectPath)
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null

  const segments = relative.split(path.sep)
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index]
    if (segment?.endsWith('.app') && isElectronHelperAppName(path.basename(segment, '.app'))) {
      return path.join(appRoot, ...segments.slice(0, index + 1))
    }
  }

  return null
}

function isElectronHelperAppName(appName: string): boolean {
  return /\bHelper\b/.test(appName)
}

function helperProfileForAppName(appName: string): EntitlementProfileId {
  if (appName.includes('(Renderer)')) return 'helper-renderer'
  if (appName.includes('(GPU)')) return 'helper-gpu'
  if (appName.includes('(Plugin)')) return 'helper-plugin'
  return 'helper-generic'
}
