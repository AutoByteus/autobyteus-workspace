import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { defineStore } from 'pinia'
import {
  delegatedTargetKey,
  loadDelegatedRunLaunches,
  loadDelegatedRunOptions,
  saveDelegatedRuns,
  terminateDelegatedRun,
  type DelegatedReference,
  type DelegatedRoot,
  type DelegatedTargetKey,
  type StoredRunLaunch,
} from '~/services/runConfigEditing/delegatedLaunchSelectionClient'
import type { DelegatedSaveTarget } from '~/utils/runSettings/delegatedLaunchRows'
import { cloneExistingAgentRunSelection, existingAgentRunSelectionsEqual, selectionAllowed } from '~/services/runConfigEditing/existingAgentModelConfigDraft'
import { mergeReloadedOptions } from '~/services/runConfigEditing/existingRunModelOptionsState'
import type {
  ExistingRunModelConfigFieldError,
  ExistingRunModelOptionsState,
  ExistingAgentRunSelection,
} from '~/types/agent/ExistingRunModelConfigDraft'

const sameRoot = (left: DelegatedRoot | null, right: DelegatedRoot | null): boolean =>
  left?.rootKind === right?.rootKind && left?.rootRunId === right?.rootRunId
const rootKey = (root: DelegatedRoot): string => `${root.rootKind}:${root.rootRunId}`
const stopKey = (root: DelegatedRoot, reference: DelegatedReference): string => `${rootKey(root)}|${delegatedTargetKey(reference)}`

/**
 * The user's model choices for a run's delegated runs, edited in Settings next to the run's own settings and saved
 * through the same Save bar, and the per-run Stop shared by Settings and the sidebar rows (autobyteus-461 rule 2,
 * SR-064 … SR-066): each delegated run is reached as itself, its options by its own query, its choice by its own
 * stopped-run save, its Stop by its own terminate. A choice is kept per agent (`agent:<run ID>`) or per Team
 * (`team:<run ID>`); it is edited only while that run is stopped.
 */
export const useDelegatedLaunchDraftStore = defineStore('delegatedLaunchDraft', {
  state: () => ({
    root: null as DelegatedRoot | null,
    /** Where each shown row's change is saved (the editor's rows; SR-064). */
    targets: new Map() as ReadonlyMap<DelegatedTargetKey, DelegatedSaveTarget>,
    bindingRevision: -1,
    saveRequestId: 0,
    /** This edit's choices and the model each target had when it was first edited. */
    edits: {} as Record<DelegatedTargetKey, ExistingAgentRunSelection>,
    originals: {} as Record<DelegatedTargetKey, ExistingAgentRunSelection>,
    optionsByKey: {} as Record<DelegatedTargetKey, ExistingRunModelOptionsState>,
    /**
     * Each row's run's launch as its own file has it now (CR-461-086): read from the run itself when its row appears and
     * after a Save or a Stop, and its own save answer until that read returns (CR-461-077). Its row shows it, not the
     * launch the delegator's view read earlier.
     */
    stored: {} as Record<DelegatedTargetKey, StoredRunLaunch>,
    launchesRequestId: 0,
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
    changes(state): readonly Readonly<{ key: DelegatedTargetKey; selection: ExistingAgentRunSelection }>[] {
      return (Object.entries(state.edits) as [DelegatedTargetKey, ExistingAgentRunSelection][])
        .filter(([key, selection]) => !state.originals[key] || !existingAgentRunSelectionsEqual(state.originals[key]!, selection))
        .map(([key, selection]) => ({ key, selection: cloneExistingAgentRunSelection(selection) }))
    },
    dirty(): boolean { return this.changes.length > 0 },
    /**
     * Every changed model is one the server offers for that copy (its current one, or a listed replacement); another
     * agent runtime is a fresh selection of it, which the server validates when it is saved.
     */
    changesAllowed(state): boolean {
      return this.changes.every(({ key, selection }) => selectionAllowed(state.originals[key]!, selection, state.optionsByKey[key]))
    },
  },
  actions: {
    /**
     * Settings opened another run (or closed): this edit and the options start over. Saved choices
     * are the server's: rows read them from the run (its view's row records, and after a Save its own save answer, `saved`).
     */
    bind(root: DelegatedRoot | null): void {
      const binding = useWindowNodeContextStore().bindingRevision
      if (sameRoot(this.root, root) && this.bindingRevision === binding) return
      this.bindingRevision = binding
      this.saveRequestId += 1
      this.saving = false
      this.root = root ? { ...root } : null
      this.targets = new Map()
      this.discard()
      this.stored = {}
      this.launchesRequestId += 1
      this.optionsByKey = {}
      this.optionsStatus = 'idle'
      this.optionsRequestId += 1
      this.stopFeedback = null
    },
    /** The rows shown changed: their options and launches are read when a row is new (its own run's reads, SR-065). */
    setTargets(targets: ReadonlyMap<DelegatedTargetKey, DelegatedSaveTarget>): void {
      const known = this.targets
      this.targets = targets
      if (this.root && [...targets.keys()].some((key) => !known.has(key))) {
        void this.loadOptions()
        void this.loadLaunches()
      }
    },
    /** Each row's run's launch, read from the run itself (CR-461-086); a run that cannot be read keeps what its row had. */
    async loadLaunches(): Promise<void> {
      if (!this.root) return
      const requestId = ++this.launchesRequestId, binding = useWindowNodeContextStore().bindingRevision
      const launches = await loadDelegatedRunLaunches(this.targets)
      if (requestId !== this.launchesRequestId || binding !== useWindowNodeContextStore().bindingRevision) return
      this.stored = { ...this.stored, ...launches }
    },
    /** A run's own save answer: its launch now, until its read returns its source too. */
    applySaved(saved: Readonly<Record<DelegatedTargetKey, ExistingAgentRunSelection>>): void {
      const next = { ...this.stored }
      for (const [key, selection] of Object.entries(saved) as [DelegatedTargetKey, ExistingAgentRunSelection][]) {
        const before = next[key]
        next[key] = { launch: { ...before?.launch, ...cloneExistingAgentRunSelection(selection) }, ownSource: before?.ownSource ?? true,
          ...(before && 'source' in before ? { source: before.source } : {}) }
      }
      this.stored = next
    },
    async loadOptions(): Promise<void> {
      if (!this.root) return
      const requestId = ++this.optionsRequestId, binding = useWindowNodeContextStore().bindingRevision
      this.optionsStatus = 'loading'
      const { options, complete } = await loadDelegatedRunOptions(this.targets)
      if (requestId !== this.optionsRequestId || binding !== useWindowNodeContextStore().bindingRevision) return
      this.optionsByKey = { ...this.optionsByKey, ...options }
      this.optionsStatus = complete || Object.keys(options).length ? 'ready' : 'unavailable'
    },
    /**
     * Re-reads the copies' options (a picker opened, or Refresh models): the options shown stay until the answer arrives, a
     * copy the server could not read never replaces options already shown (`mergeReloadedOptions`), and the answer is false
     * when any copy could not be read. An answer made stale by a newer read is not a failure.
     */
    async reloadOptions(): Promise<boolean> {
      if (!this.root) return true
      const requestId = ++this.optionsRequestId, binding = useWindowNodeContextStore().bindingRevision
      const stale = () => requestId !== this.optionsRequestId || binding !== useWindowNodeContextStore().bindingRevision
      const { options, complete } = await loadDelegatedRunOptions(this.targets)
      if (stale()) return true
      const merged = mergeReloadedOptions(this.optionsByKey, options)
      this.optionsByKey = { ...this.optionsByKey, ...merged.options }
      this.optionsStatus = 'ready'
      return complete && merged.complete
    },
    /** A model, its settings or its agent runtime changed on a copy row; `original` is what the target ran with before this edit. */
    edit(key: DelegatedTargetKey, original: ExistingAgentRunSelection, selection: ExistingAgentRunSelection): void {
      if (this.saving) return
      if (!this.originals[key]) this.originals = { ...this.originals, [key]: cloneExistingAgentRunSelection(original) }
      this.edits = { ...this.edits, [key]: cloneExistingAgentRunSelection(selection) }
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
     * Saves this edit's choices, each by its own run's stopped-run save, in row order (SR-064; the editor saves the run's
     * own settings first). A row whose run is running refuses the Save before any write: stop it and save again (its own
     * save would refuse it too). A refusal names the run, and the runs already saved; the rows are read again.
     */
    async save(rows: Readonly<{ running(key: DelegatedTargetKey): boolean; nameOf(key: DelegatedTargetKey): string }>,
      reconcile: () => Promise<boolean>): Promise<boolean> {
      const root = this.root
      if (!root || this.saving || !this.dirty) return false
      const request = ++this.saveRequestId, binding = useWindowNodeContextStore().bindingRevision
      const current = () => request === this.saveRequestId && binding === useWindowNodeContextStore().bindingRevision && sameRoot(this.root, root)
      this.saving = true
      this.feedback = null
      this.fieldErrors = []
      try {
        const running = this.changes.filter(({ key }) => rows.running(key)).map(({ key }) => rows.nameOf(key))
        if (running.length) {
          this.feedback = { kind: 'error', message: `${running.join(', ')} is running. Stop it, then save again.` }
          return false
        }
        const result = await saveDelegatedRuns({ changes: this.changes, targets: this.targets, nameOf: rows.nameOf })
        if (!current()) return false
        // Each saved row shows what its run now has (also when a later run refused: the runs before it keep their save),
        // then its run is read again for its source (a changing save records `settings`, V-11).
        this.applySaved(result.saved)
        if (!result.success) {
          this.feedback = { kind: 'error', message: result.message }
          this.fieldErrors = [...result.fieldErrors]
          // A run that saved keeps its save: the rows are read again.
          void reconcile()
          void this.loadOptions()
          void this.loadLaunches()
          return false
        }
        void this.loadOptions()
        await this.loadLaunches()
        if (!current()) return false
        // Keep the save lock through canonical publication. A committed edit is not unsaved work,
        // even if the read fails; the Settings owner exposes read-only Refresh in that case.
        let reconciled = false
        try { reconciled = await reconcile() } finally { if (current()) this.discard() }
        if (!current() || !reconciled) return false
        this.feedback = { kind: 'success', message: result.message }
        return true
      } catch (error) {
        if (current()) this.feedback = { kind: 'error', message: error instanceof Error ? error.message : String(error) }
        return false
      } finally {
        if (current()) this.saving = false
      }
    },
    isStopping(root: DelegatedRoot, reference: DelegatedReference): boolean {
      return Boolean(this.stopping[stopKey(root, reference)])
    },
    /** Stops one delegated run as itself (rule 2): on this node or on a peer node; it stays restorable. */
    async stop(root: DelegatedRoot, reference: DelegatedReference): Promise<boolean> {
      const key = stopKey(root, reference)
      if (this.stopping[key]) return false
      this.stopping = { ...this.stopping, [key]: true }
      this.stopFeedback = null
      try {
        const result = await terminateDelegatedRun(reference)
        if (!result.success) this.stopFeedback = { kind: 'error', message: result.message }
        if (sameRoot(this.root, root)) { void this.loadOptions(); void this.loadLaunches() }
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
