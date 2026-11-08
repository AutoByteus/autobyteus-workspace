import type { TranslationKey } from '~/localization/runtime/types'

/** Why the node refused a workspace path that was not yet registered (`WORKSPACE_PATH_REFUSED`). */
export type WorkspacePathRefusalReason = 'not_absolute' | 'missing' | 'not_a_folder'

const REASONS: readonly WorkspacePathRefusalReason[] = ['not_absolute', 'missing', 'not_a_folder']

type GraphqlErrorLike = { extensions?: { code?: unknown; reason?: unknown } }

/** The refusal reason a failed `createWorkspace` carries, or `null` for any other failure. */
export const readWorkspacePathRefusal = (cause: unknown): WorkspacePathRefusalReason | null => {
  const errors = (cause as { graphQLErrors?: GraphqlErrorLike[] } | null)?.graphQLErrors ?? []
  const refusal = errors.find((error) => error?.extensions?.code === 'WORKSPACE_PATH_REFUSED')
  const reason = refusal?.extensions?.reason
  return REASONS.find((known) => known === reason) ?? null
}

/** A Windows node's path form: a backslash or a drive letter (`C:`). */
const isWindowsPathForm = (rootPath: string): boolean => rootPath.includes('\\') || /^[A-Za-z]:/.test(rootPath.trim())

const REFUSAL_TEXT_KEYS: Readonly<Record<WorkspacePathRefusalReason, TranslationKey>> = {
  not_absolute: 'workspace.pathRefusal.notAbsolute',
  missing: 'workspace.pathRefusal.missing',
  not_a_folder: 'workspace.pathRefusal.notAFolder',
}

/** What the user is told under the path field (phone) or as the launch error (desktop). */
export const workspacePathRefusalText = (
  reason: WorkspacePathRefusalReason,
  rootPath: string,
  t: (key: TranslationKey) => string,
): string => (
  reason === 'not_absolute' && isWindowsPathForm(rootPath)
    ? t('workspace.pathRefusal.notAbsoluteWindows')
    : t(REFUSAL_TEXT_KEYS[reason])
)
