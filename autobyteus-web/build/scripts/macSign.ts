import * as fs from 'fs'
import * as path from 'path'
import { signPath, verifySignedApp } from './macCodeSign'
import { discoverMacSigningSubjects } from './macSigningDiscovery'
import { classifyMacSigningSubject, MacSigningSubject, resolveEntitlementsFile } from './macSigningPolicy'

interface PerFileSignOptions {
  hardenedRuntime?: boolean
  requirements?: string
  timestamp?: string
  additionalArguments?: string[]
}

interface MacSignOptions {
  app: string
  identity?: string
  keychain?: string
  ignore?: string | RegExp | ((file: string) => boolean) | Array<string | RegExp | ((file: string) => boolean)>
  binaries?: string[]
  strictVerify?: boolean | string[]
  provisioningProfile?: string
  preEmbedProvisioningProfile?: boolean
  optionsForFile?: (filePath: string) => PerFileSignOptions
}

export async function sign(options: MacSignOptions): Promise<void> {
  if (process.platform !== 'darwin') {
    console.warn('[macSign] Skipping AutoByteus macOS signing policy: codesign is only available on macOS')
    return
  }

  if (!options.identity) {
    console.warn('[macSign] Skipping AutoByteus macOS signing policy: no signing identity was provided')
    return
  }

  const appRoot = path.resolve(options.app)
  const projectRoot = path.resolve(__dirname, '..', '..')
  embedProvisioningProfileIfRequested(options, appRoot)

  const subjects = withAdditionalBinaries(discoverMacSigningSubjects(appRoot), options.binaries, appRoot)
    .filter((subject) => !shouldIgnore(subject.path, options.ignore))

  console.log(`[macSign] Signing ${subjects.length} macOS subject(s) with AutoByteus signing policy`)
  for (const subject of subjects) {
    const perFileOptions = options.optionsForFile?.(subject.path) ?? {}
    const entitlements = resolveEntitlementsFile(subject.entitlementProfile, projectRoot)
    console.log(`  [${subject.entitlementProfile}] ${subject.relativePath}`)
    signPath({
      targetPath: subject.path,
      identity: options.identity,
      keychain: options.keychain,
      entitlements,
      hardenedRuntime: perFileOptions.hardenedRuntime,
      requirements: perFileOptions.requirements,
      timestamp: perFileOptions.timestamp,
      additionalArguments: perFileOptions.additionalArguments,
    })
  }

  verifySignedApp({ appPath: appRoot, strictVerify: options.strictVerify })
  console.log('[macSign] AutoByteus macOS signing policy completed')
}

export default sign

function withAdditionalBinaries(subjects: MacSigningSubject[], binaries: string[] | undefined, appRoot: string): MacSigningSubject[] {
  if (!binaries?.length) return subjects

  const byPath = new Map(subjects.map((subject) => [subject.path, subject]))
  for (const binary of binaries) {
    const binaryPath = path.resolve(binary)
    if (!byPath.has(binaryPath)) {
      byPath.set(binaryPath, classifyMacSigningSubject(appRoot, binaryPath))
    }
  }

  return Array.from(byPath.values()).sort((a, b) => b.path.split(path.sep).length - a.path.split(path.sep).length)
}

function shouldIgnore(filePath: string, ignore: MacSignOptions['ignore']): boolean {
  if (!ignore) return false
  const entries = Array.isArray(ignore) ? ignore : [ignore]
  return entries.some((entry) => {
    if (typeof entry === 'function') return entry(filePath)
    if (entry instanceof RegExp) return entry.test(filePath)
    return new RegExp(entry).test(filePath)
  })
}

function embedProvisioningProfileIfRequested(options: MacSignOptions, appRoot: string): void {
  if (options.preEmbedProvisioningProfile === false || !options.provisioningProfile) return

  const embeddedPath = path.join(appRoot, 'Contents', 'embedded.provisionprofile')
  if (fs.existsSync(embeddedPath)) return

  fs.copyFileSync(options.provisioningProfile, embeddedPath)
}
