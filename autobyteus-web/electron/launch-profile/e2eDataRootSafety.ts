import * as fs from 'fs'
import * as path from 'path'

const safeRootBrand = Symbol('ResolvedSafeE2EDataRoot')

export type ResolvedSafeE2EDataRoot = Readonly<{
  canonicalPath: string
  [safeRootBrand]: true
}>

type ResolveSafeRootInput = {
  selectedPath: string
  protectedPaths: readonly string[]
}

function normalizeAbsolutePath(candidatePath: string, fieldName: string): string {
  if (!candidatePath.trim()) {
    throw new Error(`${fieldName} is required`)
  }
  if (!path.isAbsolute(candidatePath)) {
    throw new Error(`${fieldName} must be an absolute path: ${candidatePath}`)
  }
  return path.normalize(candidatePath)
}

function normalizeForComparison(candidatePath: string): string {
  const normalized = path.normalize(candidatePath)
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized
}

function isSameOrDescendant(parentPath: string, candidatePath: string): boolean {
  const relative = path.relative(
    normalizeForComparison(parentPath),
    normalizeForComparison(candidatePath),
  )
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

function pathsOverlap(leftPath: string, rightPath: string): boolean {
  return isSameOrDescendant(leftPath, rightPath) || isSameOrDescendant(rightPath, leftPath)
}

function lstatIfPresent(candidatePath: string): fs.Stats | null {
  try {
    return fs.lstatSync(candidatePath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null
    }
    throw error
  }
}

/**
 * Project an absolute path through its deepest existing ancestor without creating anything.
 */
export function projectCanonicalPathWithoutMutation(candidatePath: string): string {
  const lexicalPath = normalizeAbsolutePath(candidatePath, 'Path')
  let existingCandidate = lexicalPath
  const missingSuffix: string[] = []

  while (true) {
    const entry = lstatIfPresent(existingCandidate)
    if (entry) {
      const canonicalAncestor = fs.realpathSync(existingCandidate)
      const canonicalStat = fs.statSync(canonicalAncestor)
      if (!canonicalStat.isDirectory()) {
        throw new Error(`Nearest existing ancestor is not a directory: ${existingCandidate}`)
      }
      return path.join(canonicalAncestor, ...missingSuffix)
    }

    const parent = path.dirname(existingCandidate)
    if (parent === existingCandidate) {
      throw new Error(`Unable to resolve an existing ancestor for path: ${lexicalPath}`)
    }
    missingSuffix.unshift(path.basename(existingCandidate))
    existingCandidate = parent
  }
}

function protectedPathForms(protectedPath: string): string[] {
  const lexicalPath = normalizeAbsolutePath(protectedPath, 'Protected path')
  const projectedPath = projectCanonicalPathWithoutMutation(lexicalPath)
  return Array.from(new Set([lexicalPath, projectedPath]))
}

export function resolveExistingSafeE2EDataRoot({
  selectedPath,
  protectedPaths,
}: ResolveSafeRootInput): ResolvedSafeE2EDataRoot {
  const lexicalSelectedPath = normalizeAbsolutePath(selectedPath, 'E2E data root')
  const filesystemRoot = path.parse(lexicalSelectedPath).root
  if (normalizeForComparison(lexicalSelectedPath) === normalizeForComparison(filesystemRoot)) {
    throw new Error('E2E data root cannot be the filesystem root')
  }

  const projectedSelectedPath = projectCanonicalPathWithoutMutation(lexicalSelectedPath)
  const selectedEntry = lstatIfPresent(lexicalSelectedPath)
  if (!selectedEntry) {
    throw new Error(`E2E data root must already exist: ${lexicalSelectedPath}`)
  }
  if (selectedEntry.isSymbolicLink()) {
    throw new Error(`E2E data root must not be a symbolic link: ${lexicalSelectedPath}`)
  }
  if (!selectedEntry.isDirectory()) {
    throw new Error(`E2E data root must be a directory: ${lexicalSelectedPath}`)
  }

  const canonicalSelectedPath = fs.realpathSync(lexicalSelectedPath)
  if (
    normalizeForComparison(canonicalSelectedPath)
    !== normalizeForComparison(projectedSelectedPath)
  ) {
    throw new Error(`E2E data root canonical projection changed during validation: ${lexicalSelectedPath}`)
  }

  const selectedForms = Array.from(new Set([
    lexicalSelectedPath,
    projectedSelectedPath,
    canonicalSelectedPath,
  ]))
  for (const protectedPath of protectedPaths) {
    for (const selectedForm of selectedForms) {
      for (const protectedForm of protectedPathForms(protectedPath)) {
        if (pathsOverlap(selectedForm, protectedForm)) {
          throw new Error(
            `E2E data root overlaps protected production path: ${protectedPath}`,
          )
        }
      }
    }
  }

  return Object.freeze({
    canonicalPath: canonicalSelectedPath,
    [safeRootBrand]: true as const,
  })
}

export function getResolvedSafeE2EDataRootPath(root: ResolvedSafeE2EDataRoot): string {
  if (root[safeRootBrand] !== true) {
    throw new Error('E2E data root was not authorized by the safe-root resolver')
  }
  return root.canonicalPath
}
