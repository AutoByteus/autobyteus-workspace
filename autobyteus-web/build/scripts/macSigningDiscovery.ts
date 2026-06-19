import * as fs from 'fs'
import * as path from 'path'
import { classifyMacSigningSubject, MacSigningSubject } from './macSigningPolicy'

const MACHO_MAGICS = new Set([
  0xfeedface,
  0xcefaedfe,
  0xfeedfacf,
  0xcffaedfe,
  0xcafebabe,
  0xbebafeca,
])

export function discoverMacSigningSubjects(appRoot: string): MacSigningSubject[] {
  const normalizedAppRoot = path.resolve(appRoot)
  const contentsRoot = path.join(normalizedAppRoot, 'Contents')
  const subjectPaths: string[] = []

  if (fs.existsSync(contentsRoot)) {
    collectSubjectPaths(contentsRoot, subjectPaths)
  }

  subjectPaths.push(normalizedAppRoot)

  return uniquePaths(subjectPaths)
    .map((subjectPath) => classifyMacSigningSubject(normalizedAppRoot, subjectPath))
    .sort(compareSubjectsForSigning)
}

export function isMachOFile(filePath: string): boolean {
  let descriptor: number | null = null
  try {
    descriptor = fs.openSync(filePath, 'r')
    const buffer = Buffer.alloc(4)
    if (fs.readSync(descriptor, buffer, 0, 4, 0) !== 4) return false
    return MACHO_MAGICS.has(buffer.readUInt32BE(0)) || MACHO_MAGICS.has(buffer.readUInt32LE(0))
  } catch {
    return false
  } finally {
    if (descriptor != null) fs.closeSync(descriptor)
  }
}

function collectSubjectPaths(dirPath: string, subjects: string[]): void {
  const entries = safeReadDir(dirPath)
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isSymbolicLink()) continue

    if (entry.isDirectory()) {
      collectSubjectPaths(fullPath, subjects)
      if (isSignableBundle(fullPath)) subjects.push(fullPath)
    } else if (entry.isFile() && isMachOFile(fullPath)) {
      subjects.push(fullPath)
    }
  }
}

function safeReadDir(dirPath: string): fs.Dirent[] {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true })
  } catch {
    return []
  }
}

function isSignableBundle(dirPath: string): boolean {
  return dirPath.endsWith('.app') || dirPath.endsWith('.framework') || dirPath.endsWith('.xpc')
}

function uniquePaths(paths: string[]): string[] {
  return Array.from(new Set(paths.map((entry) => path.resolve(entry))))
}

function compareSubjectsForSigning(a: MacSigningSubject, b: MacSigningSubject): number {
  if (a.kind === 'root-app' && a.signingTargetKind === 'app-bundle') return 1
  if (b.kind === 'root-app' && b.signingTargetKind === 'app-bundle') return -1

  const depthDelta = b.path.split(path.sep).length - a.path.split(path.sep).length
  if (depthDelta !== 0) return depthDelta

  return targetKindRank(a) - targetKindRank(b)
}

function targetKindRank(subject: MacSigningSubject): number {
  switch (subject.signingTargetKind) {
    case 'macho-file':
    case 'app-main-executable':
      return 0
    case 'xpc-bundle':
      return 1
    case 'framework-bundle':
      return 2
    case 'app-bundle':
      return 3
    default:
      return 4
  }
}
