/**
 * One skill per name (D-19). The server rejects an incoming duplicate among its skills folder,
 * agent packages and added folders with `SKILL_NAME_CONFLICT`, and reports copies it ignores
 * through `skillNameIssues`.
 */
export const SKILL_NAME_CONFLICT_CODE = 'SKILL_NAME_CONFLICT'

export interface SkillNameConflict {
  name: string
  existingPath: string
  incomingPath: string
}

export type SkillNameIssueKind = 'conflict' | 'shadowed_runtime_default'

export interface SkillNameIssue {
  name: string
  usedPath: string
  ignoredPaths: string[]
  kind: SkillNameIssueKind
}

/** A rejected import, new skill folder or new skill; carries every duplicate name. */
export class SkillNameConflictError extends Error {
  constructor(message: string, readonly conflicts: SkillNameConflict[]) {
    super(message)
    this.name = 'SkillNameConflictError'
  }
}

type GraphqlErrorLike = { message?: string; extensions?: Record<string, unknown> | null }

const isConflict = (value: unknown): value is SkillNameConflict => {
  const candidate = value as Partial<SkillNameConflict> | null
  return typeof candidate?.name === 'string'
    && typeof candidate.existingPath === 'string'
    && typeof candidate.incomingPath === 'string'
}

/**
 * Reads a `SKILL_NAME_CONFLICT` from an Apollo error (`graphQLErrors`) or a raw GraphQL `errors`
 * array. Returns null for any other failure.
 */
export const readSkillNameConflictError = (source: unknown): SkillNameConflictError | null => {
  const errors: GraphqlErrorLike[] = Array.isArray(source)
    ? source
    : ((source as { graphQLErrors?: GraphqlErrorLike[] } | null)?.graphQLErrors ?? [])
  const error = errors.find((entry) => entry?.extensions?.code === SKILL_NAME_CONFLICT_CODE)
  if (!error) return null
  const conflicts = Array.isArray(error.extensions?.conflicts)
    ? (error.extensions.conflicts as unknown[]).filter(isConflict)
    : []
  return new SkillNameConflictError(error.message ?? 'Duplicate skill names', conflicts)
}

/** Paths in runtime default folders that `after` ignores and `before` did not (tier-4 notices). */
export const newlyShadowedRuntimeDefaultPaths = (
  before: readonly SkillNameIssue[],
  after: readonly SkillNameIssue[],
): string[] => {
  const known = new Set(before
    .filter((issue) => issue.kind === 'shadowed_runtime_default')
    .flatMap((issue) => issue.ignoredPaths))
  return after
    .filter((issue) => issue.kind === 'shadowed_runtime_default')
    .flatMap((issue) => issue.ignoredPaths)
    .filter((ignoredPath) => !known.has(ignoredPath))
}

const RUNTIME_DEFAULT_FOLDERS: ReadonlyArray<[RegExp, string]> = [
  [/[\\/]\.codex[\\/]/, 'Codex'],
  [/[\\/]\.claude[\\/]/, 'Claude'],
  [/[\\/]\.grok[\\/]/, 'Grok'],
  [/[\\/]\.agents[\\/]/, 'Agents'],
]

/** The runtime whose default folder holds these paths, when they all share one; else null. */
export const runtimeDefaultFolderLabel = (paths: readonly string[]): string | null => {
  const labels = new Set(paths.map((entry) =>
    RUNTIME_DEFAULT_FOLDERS.find(([pattern]) => pattern.test(entry))?.[1] ?? null))
  return labels.size === 1 ? [...labels][0] : null
}

/** The conflict carried by any caught mutation failure, or null. */
export const toSkillNameConflict = (error: unknown): SkillNameConflictError | null =>
  error instanceof SkillNameConflictError ? error : readSkillNameConflictError(error)
