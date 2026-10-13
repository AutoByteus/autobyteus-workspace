import { defineStore } from 'pinia'
import {
  delegatedTargetKey,
  loadDelegatedLaunchModelOptions,
  stopDelegatedExecution,
  updateDelegatedLaunchSelections,
  type DelegatedConfiguredPatch,
  type DelegatedReference,
  type DelegatedRoot,
  type DelegatedTargetKey,
} from '~/services/runConfigEditing/delegatedLaunchSelectionClient'
import { cloneExistingRunSelection, existingRunSelectionsEqual, selectionAllowed } from '~/services/runConfigEditing/existingAgentModelConfigDraft'
import type {
  ExistingRunModelConfigFieldError,
  ExistingRunModelOptionsState,
  ExistingRunModelSelection,
} from '~/types/agent/ExistingRunModelConfigDraft'

const sameRoot = (left: DelegatedRoot | null, right: DelegatedRoot | null): boolean =>
  left?.rootKind === right?.rootKind && left?.rootRunId === right?.rootRunId
const rootKey = (root: DelegatedRoot): string => `${root.rootKind}:${root.rootRunId}`
const stopKey = (root: DelegatedRoot, reference: DelegatedReference): string => `${rootKey(root)}|${delegatedTargetKey(reference)}`

/**
 * DS-001 / DS-002 (SR-007): the user's model choices for a run's delegated copies and collaborators,
 * edited in Settings next to the run's own settings and saved through the same Save bar, and the
 * per-copy Stop shared by Settings and the sidebar rows. A choice is recorded per agent
 * (`agent:<run ID>`) or per Team (`team:<run ID>`); it is edited only while that copy is stopped.
 */
export const useDelegatedLaunchDraftStore = defineStore('delegatedLaunchDraft', {
  state: () => ({
    root: null as DelegatedRoot | null,
    /** This edit's choices and the model each target had when it was first edited. */
    edits: {} as Record<DelegatedTargetKey, ExistingRunModelSelection>,
    originals: {} as Record<DelegatedTargetKey, ExistingRunModelSelection>,
    optionsByKey: {} as Record<DelegatedTargetKey, ExistingRunModelOptionsState>,
    optionsStatus: 'idle' as 'idle' | 'loading' | 'ready' | 'unavailable',
    optionsRequestId: 0,
    saving: false,
    feedback: null as { kind: 'success' | 'error'; message: string } | null,
    fieldErrors: [] as ExistingRunModelConfigFieldError[],
    /** Stops in flight, by root and target (Settings and the sidebar share them). */
    stopping: {} as Record<string, boolean>,
    stopFeedback: null as { kind: 'info' | 'error'; message: string } | null,
  }),
  getters: {
    changes(state): readonly Readonly<{ key: DelegatedTargetKey; selection: ExistingRunModelSelection }>[] {
      return (Object.entries(state.edits) as [DelegatedTargetKey, ExistingRunModelSelection][])
        .filter(([key, selection]) => !state.originals[key] || !existingRunSelectionsEqual(state.originals[key]!, selection))
        .map(([key, selection]) => ({ key, selection: cloneExistingRunSelection(selection) }))
    },
    dirty(): boolean { return this.changes.length > 0 },
    /** Every changed model is one the server offers for that copy (its current one, or a listed replacement). */
    changesAllowed(state): boolean {
      return this.changes.every(({ key, selection }) => selectionAllowed(state.originals[key]!, selection, state.optionsByKey[key]))
    },
  },
  actions: {
    /**
     * Settings opened another run (or closed): this edit and the options start over. Saved choices
     * are the server's: rows read them from the run (its live view, or Settings' reload after Save).
     */
    bind(root: DelegatedRoot | null): void {
      if (sameRoot(this.root, root)) return
      this.root = root ? { ...root } : null
      this.discard()
      this.optionsByKey = {}
      this.optionsStatus = 'idle'
      this.optionsRequestId += 1
      this.stopFeedback = null
      if (root) void this.loadOptions()
    },
    async loadOptions(): Promise<void> {
      const root = this.root
      if (!root) return
      const requestId = ++this.optionsRequestId
      this.optionsStatus = 'loading'
      try {
        const options = await loadDelegatedLaunchModelOptions(root)
        if (requestId !== this.optionsRequestId) return
        this.optionsByKey = options
        this.optionsStatus = 'ready'
      } catch {
        if (requestId !== this.optionsRequestId) return
        this.optionsByKey = {}
        this.optionsStatus = 'unavailable'
      }
    },
    /** A model or its settings changed on a copy row; `original` is what the target ran with before this edit. */
    edit(key: DelegatedTargetKey, original: ExistingRunModelSelection, selection: ExistingRunModelSelection): void {
      if (this.saving) return
      if (!this.originals[key]) this.originals = { ...this.originals, [key]: cloneExistingRunSelection(original) }
      this.edits = { ...this.edits, [key]: cloneExistingRunSelection(selection) }
      this.feedback = null
      this.fieldErrors = []
    },
    discard(): void {
      this.edits = {}
      this.originals = {}
      this.feedback = null
      this.fieldErrors = []
    },
    /**
     * Saves this edit's choices; on a stopped run, together with the run's own settings in one Save
     * (AR-004). A running copy refuses the whole Save (`COPY_RUNNING`): stop it and save again.
     */
    async save(configuredPatches: readonly DelegatedConfiguredPatch[] = []): Promise<boolean> {
      const root = this.root
      if (!root || this.saving || (!this.dirty && !configuredPatches.length)) return false
      this.saving = true
      this.feedback = null
      this.fieldErrors = []
      try {
        const result = await updateDelegatedLaunchSelections({ ...root, changes: this.changes, configuredPatches })
        if (!sameRoot(this.root, root)) return false
        if (!result.success) {
          this.feedback = { kind: 'error', message: result.message }
          this.fieldErrors = [...result.fieldErrors]
          return false
        }
        this.discard()
        this.feedback = { kind: 'success', message: result.message }
        void this.loadOptions()
        return true
      } catch (error) {
        if (sameRoot(this.root, root)) this.feedback = { kind: 'error', message: error instanceof Error ? error.message : String(error) }
        return false
      } finally {
        if (sameRoot(this.root, root)) this.saving = false
      }
    },
    isStopping(root: DelegatedRoot, reference: DelegatedReference): boolean {
      return Boolean(this.stopping[stopKey(root, reference)])
    },
    /** DS-002: stops one copy or collaborator (and the copies it started); it stays restorable. */
    async stop(root: DelegatedRoot, reference: DelegatedReference): Promise<boolean> {
      const key = stopKey(root, reference)
      if (this.stopping[key]) return false
      this.stopping = { ...this.stopping, [key]: true }
      this.stopFeedback = null
      try {
        const result = await stopDelegatedExecution(root, reference)
        if (!result.success) this.stopFeedback = { kind: 'error', message: result.message }
        else if (result.notStoppedUnattributed > 0) this.stopFeedback = { kind: 'info', message: result.message }
        if (sameRoot(this.root, root)) void this.loadOptions()
        return result.success
      } catch (error) {
        this.stopFeedback = { kind: 'error', message: error instanceof Error ? error.message : String(error) }
        return false
      } finally {
        const { [key]: _done, ...rest } = this.stopping
        this.stopping = rest
      }
    },
  },
})
