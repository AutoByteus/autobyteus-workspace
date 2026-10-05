import { useWorkspaceStore } from '~/stores/workspace'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'
import type { ExistingRunConfigDraft } from '~/types/agent/ExistingRunConfigDraft'
import type {
  ExistingRunModelConfigSchemaState,
  ExistingRunModelOptionsState,
  ExistingRunModelSelection,
} from '~/types/agent/ExistingRunModelConfigDraft'
import { selectionAllowed, cloneExistingRunModelConfig } from '~/services/runConfigEditing/existingAgentModelConfigDraft'
import { createExistingTeamModelConfigDraft } from '~/services/runConfigEditing/existingTeamModelConfigDraft'
import { createExistingAgentOrgModelConfigDraft } from '~/services/runConfigEditing/existingAgentOrgModelConfigDraft'
import { createExistingAgentOrgWorkspaceDraft, existingAgentOrgWorkspacesDirty } from '~/services/runConfigEditing/existingAgentOrgWorkspaceDraft'

/**
 * The saved-run settings edits that are not saving itself (UIS-003): each scope's save readiness,
 * Cancel and the re-read after a lifecycle change. Mixed into `existingRunConfigStore`.
 */
const loadingSchemaState = (): ExistingRunModelConfigSchemaState => ({ status: 'loading', message: null })
type ExistingAgentDraft = Extract<ExistingRunConfigDraft, { kind: 'agent' }>
const metadataSelection = (metadata: ExistingAgentDraft['metadata']): ExistingRunModelSelection => ({
  llmModelIdentifier: metadata.llmModelIdentifier,
  llmConfig: cloneExistingRunModelConfig(metadata.llmConfig),
})

/**
 * Whether a scope's chosen model can be saved. The run's own model needs no options (its settings
 * stay editable when the replacement list cannot be read), unless the runtime reports it is no
 * longer offered; another model must be one of the replacements the server allows.
 */
const schemaStateFor = (
  original: ExistingRunModelSelection,
  selection: ExistingRunModelSelection,
  options: ExistingRunModelOptionsState | undefined,
): ExistingRunModelConfigSchemaState => {
  const offeredOptions = options?.status === 'ready' ? options.options : null
  if (selection.llmModelIdentifier === original.llmModelIdentifier) {
    return offeredOptions && offeredOptions.currentModelIdentifier === original.llmModelIdentifier && !offeredOptions.currentModel
      ? { status: 'invalid', message: offeredOptions.unavailableReason }
      : { status: 'ready', message: null }
  }
  if (!options || options.status === 'loading') return loadingSchemaState()
  if (!offeredOptions) {
    return { status: 'unavailable', message: localizationRuntime.translate('workspace.runModelConfig.optionsUnavailable') }
  }
  return selectionAllowed(original, selection, options)
    ? { status: 'ready', message: null }
    : { status: 'invalid', message: offeredOptions.unavailableReason }
}

export const existingRunConfigEditActions = {
  /** Each scope's save readiness from its model options and its edited model. */
  deriveSchemaStates(this: any): void {
    const draft = this.draft
    if (!draft) return
    type ScopeSelections = { originalSelection: ExistingRunModelSelection; draftSelection: ExistingRunModelSelection }
    const scopes: Record<string, ScopeSelections> = draft.kind === 'agent'
      ? { '/': { originalSelection: metadataSelection(draft.metadata), draftSelection: draft.draftSelection } }
      : draft.planner.scopesByAddress
    this.schemaStateByAddress = Object.fromEntries(Object.entries(scopes).map(([address, scope]) => [address,
      schemaStateFor(scope.originalSelection, scope.draftSelection, this.modelOptionsByAddress[address])]))
  },
  /** Cancel: the run's saved model, thinking and placed-team workspaces again (no request). */
  discardChanges(this: any): void {
    const draft = this.draft
    if (!draft || this.saving || this.reconciling) return
    if (draft.kind === 'agent') {
      this.draft = { ...draft, draftSelection: metadataSelection(draft.metadata) }
    } else if (draft.kind === 'team') {
      this.draft = { ...draft, planner: createExistingTeamModelConfigDraft(draft.executionTree) }
    } else {
      const workspaceDirty = existingAgentOrgWorkspacesDirty(draft.executionTree, draft.workspaceDraft)
      this.draft = { ...draft,
        planner: createExistingAgentOrgModelConfigDraft(draft.executionTree),
        workspaceDraft: createExistingAgentOrgWorkspaceDraft(draft.executionTree, useWorkspaceStore().allWorkspaces) }
      if (workspaceDirty) void this.refreshModelOptions()
    }
    this.feedback = null
    this.fieldErrors = []
    this.deriveSchemaStates()
  },
  /**
   * After a lifecycle change (the stop icon): read the run's canonical settings again, so
   * editability comes from the server, through the same loader as Refresh.
   */
  async reloadCanonical(this: any): Promise<void> {
    const target = this.loadTarget
    if (!target || this.saving || this.reconciling) return
    if (target.kind === 'agent') await this.loadAgentCanonical(target.runId)
    else if (target.kind === 'team') await this.loadTeamCanonical(target.teamRunId)
    else await this.loadAgentOrgCanonical(target.orgRunId)
  },
}
