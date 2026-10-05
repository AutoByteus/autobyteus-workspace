import type { RunWorkspaceChoice } from './RunWorkspaceChoice'

/**
 * The run settings every run surface shows with the chat controls: Workspace, Model (with its
 * runtime), Thinking (and the model's other settings, REQ-022) and Tool approval.
 */
export type RunSettingField = 'workspace' | 'model' | 'thinking' | 'approval'

export const ALL_RUN_SETTING_FIELDS: readonly RunSettingField[] = ['workspace', 'model', 'thinking', 'approval']
/** DEC-002: members customize model (+runtime), thinking and tool approval. */
export const MEMBER_RUN_SETTING_FIELDS: readonly RunSettingField[] = ['model', 'thinking', 'approval']
/** A team placed in an Org also chooses its own workspace. */
export const PLACED_TEAM_RUN_SETTING_FIELDS: readonly RunSettingField[] = ALL_RUN_SETTING_FIELDS

export interface RunSettingsValues {
  workspace: RunWorkspaceChoice | null
  runtimeKind: string
  llmModelIdentifier: string
  /** Thinking and the other model settings live together in the model config. */
  llmConfig: Record<string, unknown> | null
  autoExecuteTools: boolean
}

export type RunSettingFlags = Partial<Record<RunSettingField, boolean>>

export interface RunModelChoice {
  runtimeKind: string
  llmModelIdentifier: string
}

/** One edit of a member's settings in the Member settings drawer or a saved run's Members list. */
export type RunMemberSettingChange =
  | Readonly<{ field: 'model'; choice: RunModelChoice }>
  /** A thinking or other-model-setting change: the member's whole new model config. */
  | Readonly<{ field: 'thinking'; llmConfig: Record<string, unknown> | null }>
  | Readonly<{ field: 'approval'; value: boolean }>
  | Readonly<{ field: 'workspace'; choice: RunWorkspaceChoice }>

/** Reset one field (or one other model setting by key, or the whole member) to its parent's value. */
export type RunMemberSettingReset =
  | Readonly<{ field: RunSettingField }>
  | Readonly<{ field: 'option'; key: string }>
  | Readonly<{ field: 'all' }>
