/**
 * afterPack hook for electron-builder.
 *
 * This hook only normalizes packaged native resource file modes before macOS
 * signing. Entitlement selection and codesigning are owned by macSign.ts.
 */
import * as path from 'path'
import * as fs from 'fs'
import { AfterPackContext } from 'electron-builder'

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

function normalizeNodePtySpawnHelpers(resourcesPath: string): void {
  const nodeModulesPath = path.join(resourcesPath, 'node_modules')
  const scanRoot = fs.existsSync(nodeModulesPath) ? nodeModulesPath : resourcesPath
  const helpers = getAllFiles(scanRoot).filter((filePath) => (
    path.basename(filePath) === 'spawn-helper' &&
    filePath.split(path.sep).includes('node-pty')
  ))

  for (const helper of helpers) {
    const currentMode = fs.statSync(helper).mode & 0o777
    fs.chmodSync(helper, currentMode | 0o111)
  }

  console.log(`  Normalized execute bits on ${helpers.length} node-pty spawn-helper file(s)`)
}

export default async function afterPack(context: AfterPackContext): Promise<void> {
  if (process.platform !== 'darwin') return

  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
  const resourcesPath = path.join(appPath, 'Contents', 'Resources', 'server')

  if (!fs.existsSync(resourcesPath)) {
    console.log(`  Server resources not found at ${resourcesPath}, skipping`)
    return
  }

  console.log('\nNormalizing packaged terminal native resources...')
  normalizeNodePtySpawnHelpers(resourcesPath)
}
