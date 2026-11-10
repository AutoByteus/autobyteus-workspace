import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { existingAgentOrgWorkspacesValid } from '~/services/runConfigEditing/existingAgentOrgWorkspaceDraft'
import { loadExistingRunModelOptions } from '~/services/runConfigEditing/existingRunModelOptionsClient'
import { mergeReloadedOptions } from '~/services/runConfigEditing/existingRunModelOptionsState'

/**
 * How a saved run's model options are read, mixed into `existingRunConfigStore`: the first read of an edit
 * (`refreshModelOptions`: every scope shows `loading` until it answers) and the background re-read a model picker asks
 * for (`reloadModelOptions`: the options shown stay in place until the answer arrives, and a row the server could not
 * read never replaces options already shown).
 */
export const existingRunModelOptionsActions = {
  async refreshModelOptions(this: any, delayMs = 0): Promise<void> {
    const draft = this.draft
    if (!draft) return
    const requestId = ++this.optionsRequestId, binding = useWindowNodeContextStore().bindingRevision
    const addresses = draft.kind === 'agent' ? ['/'] : Object.keys(draft.planner.scopesByAddress)
    this.modelOptionsByAddress = Object.fromEntries(addresses.map((address) => [address, { status: 'loading', options: null }]))
    if (draft.kind === 'agent_org' && !existingAgentOrgWorkspacesValid(draft.executionTree, draft.workspaceDraft)) {
      this.modelOptionsByAddress = Object.fromEntries(addresses.map(address => [address, { status: 'unavailable', options: null }]))
      return
    }
    if (delayMs) await new Promise(resolve => setTimeout(resolve, delayMs))
    if (requestId !== this.optionsRequestId || binding !== useWindowNodeContextStore().bindingRevision) return
    try {
      const options = await loadExistingRunModelOptions(draft)
      if (requestId !== this.optionsRequestId || binding !== useWindowNodeContextStore().bindingRevision) return
      this.modelOptionsByAddress = options
      this.deriveSchemaStates()
    } catch {
      if (requestId !== this.optionsRequestId || binding !== useWindowNodeContextStore().bindingRevision) return
      this.modelOptionsByAddress = Object.fromEntries(addresses.map((address) => [address, { status: 'unavailable', options: null }]))
      this.deriveSchemaStates()
    }
  },
  /**
   * Re-reads the run's options (a picker opened, or Refresh models). One server read answers every scope of the run.
   * Each answered row is merged into the options shown (`mergeReloadedOptions`). Answers whether every row could be read
   * (a row whose model list the server could not read is a failure); an answer made stale by a newer read or another run
   * is not a failure.
   */
  async reloadModelOptions(this: any): Promise<boolean> {
    const draft = this.draft
    if (!draft) return true
    if (draft.kind === 'agent_org' && !existingAgentOrgWorkspacesValid(draft.executionTree, draft.workspaceDraft)) return true
    const requestId = ++this.optionsRequestId, binding = useWindowNodeContextStore().bindingRevision
    const stale = () => requestId !== this.optionsRequestId || binding !== useWindowNodeContextStore().bindingRevision
    try {
      const options = await loadExistingRunModelOptions(draft)
      if (stale()) return true
      const merged = mergeReloadedOptions(this.modelOptionsByAddress, options)
      this.modelOptionsByAddress = merged.options
      this.deriveSchemaStates()
      return merged.complete
    } catch {
      return stale()
    }
  },
}
