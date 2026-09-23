import type { WorkspaceSelectionState } from './WorkspaceSelectionState'
import type { ExistingWorkspaceDisplay } from '~/types/agent/ExistingTeamRunFormModel'

export type WorkspaceSelectorModel =
  | Readonly<{ mode: 'editable'; selection: WorkspaceSelectionState; isLoading: boolean; error: string | null }>
  | Readonly<{ mode: 'stored'; workspace: ExistingWorkspaceDisplay | null }>
