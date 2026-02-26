/**
 * afterPack hook for electron-builder
 * Signs Mach-O binaries in the server resources (native Node deps, Prisma engines, etc.)
 */
import { execSync } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import { AfterPackContext } from 'electron-builder'

/**
 * Check if a file is a Mach-O binary (executable or dylib)
 */
function isMachOBinary(filePath: string): boolean {
  try {
    const result = execSync(`file "${filePath}"`, { encoding: 'utf-8' })
    return result.includes('Mach-O')
  } catch {
    return false
  }
}

function isCandidateBinary(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.node' || ext === '.dylib' || ext === '.so') return true
  if (!ext) {
    try {
      const stats = fs.statSync(filePath)
      return (stats.mode & 0o111) !== 0
    } catch {
      return false
    }
  }
  return false
}

/**
 * Recursively find all files in a directory
 */
function getAllFiles(dirPath: string, files: string[] = []): string[] {
  if (!fs.existsSync(dirPath)) return files

  const entries = fs.readdirSync(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      getAllFiles(fullPath, files)
    } else if (entry.isFile()) {
      files.push(fullPath)
    }
  }

  return files
}

/**
 * Sign a single file with codesign
 */
function signFile(filePath: string, identity: string, entitlements?: string): void {
  const entitlementsArg = entitlements ? `--entitlements "${entitlements}"` : ''
  const timestampArg = process.env.NO_TIMESTAMP ? '' : '--timestamp'
  const cmd = `codesign --sign "${identity}" --force ${timestampArg} --options runtime ${entitlementsArg} "${filePath}"`

  console.log(`  Signing: ${path.basename(filePath)}`)
  try {
    execSync(cmd, { stdio: 'pipe' })
  } catch (error: any) {
    console.error(`  [WARN] Failed to sign ${filePath}: ${error.message}`)
    throw error
  }
}

/**
 * Main afterPack hook
 * Called by electron-builder after the app is packaged but before signing
 */
export default async function afterPack(context: AfterPackContext): Promise<void> {
  // Only run on macOS
  if (process.platform !== 'darwin') {
    return
  }

  const identity = process.env.APPLE_SIGNING_IDENTITY
  if (!identity) {
    console.log('[WARN] APPLE_SIGNING_IDENTITY not set, skipping extra resource signing')
    return
  }

  console.log('\nSigning extra resources (server binaries)...')

  // Path to resources inside the packaged app
  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
  const resourcesPath = path.join(appPath, 'Contents', 'Resources', 'server')

  if (!fs.existsSync(resourcesPath)) {
    console.log(`  Server resources not found at ${resourcesPath}, skipping`)
    return
  }

  // Scan likely native binary locations only
  const scanRoots = [
    path.join(resourcesPath, 'node_modules')
  ].filter((dir) => fs.existsSync(dir))

  if (scanRoots.length === 0) {
    scanRoots.push(resourcesPath)
  }

  let allFiles: string[] = []
  for (const root of scanRoots) {
    allFiles = allFiles.concat(getAllFiles(root))
  }
  const binaries: string[] = []

  // Find all Mach-O binaries
  for (const file of allFiles) {
    if (isCandidateBinary(file) && isMachOBinary(file)) {
      binaries.push(file)
    }
  }

  console.log(`  Found ${binaries.length} binaries to sign`)

  // Sort by depth (deepest first) to sign nested binaries before their containers
  binaries.sort((a, b) => b.split(path.sep).length - a.split(path.sep).length)

  // Sign each binary
  const entitlements = path.join(process.cwd(), 'build', 'entitlements.mac.plist')
  const entitlementsPath = fs.existsSync(entitlements) ? entitlements : undefined

  for (const binary of binaries) {
    signFile(binary, identity, entitlementsPath)
  }

  console.log(`[OK] Signed ${binaries.length} server binaries\n`)
}
