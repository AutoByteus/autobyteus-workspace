import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { useLocalization } from '~/composables/useLocalization'
import type { ActiveAgentWorkspaceTarget } from '~/types/workspace/activeAgentWorkspaceTarget'
import type { AgentOrgMemberModelConfigRead } from '~/services/runConfigEditing/agentOrgMemberModelConfigClient'
import type { ExistingRunModelSelection, ExistingRunModelConfigSchemaState, ExistingRunModelConfigFieldError } from '~/types/agent/ExistingRunModelConfigDraft'
import { cloneExistingRunSelection, existingRunSelectionsEqual, selectionAllowed } from '~/services/runConfigEditing/existingAgentModelConfigDraft'
export type OrgMemberConfigTarget = Extract<ActiveAgentWorkspaceTarget, { kind: 'agent_org_direct_agent' | 'agent_org_team_member' | 'agent_org_task_agent' | 'agent_org_task_team_member' }>

export function useAgentOrgMemberModelConfig(target: Ref<OrgMemberConfigTarget>) {
  const store = useAgentOrgContextsStore(), binding = useWindowNodeContextStore(), { t } = useLocalization()
  const canonical = ref<AgentOrgMemberModelConfigRead | null>(null), selection = ref<ExistingRunModelSelection | null>(null)
  const loading = ref(false), saving = ref(false), refreshRequired = ref(false), feedback = ref('')
  const fieldErrors = ref<readonly ExistingRunModelConfigFieldError[]>([])
  const schema = ref<ExistingRunModelConfigSchemaState>({ status: 'loading', message: null })
  let generation = 0
  const formGeneration = ref(0)
  const configured = computed(() => target.value.kind === 'agent_org_direct_agent' || target.value.kind === 'agent_org_team_member')
  const identity = computed(() => ({ orgRunId: target.value.root.orgRunId, memberAddress: target.value.address, agentRunId: target.value.context.state.runId }))
  const key = computed(() => JSON.stringify([identity.value, binding.bindingRevision]))
  const owner = computed(() => store.contextFor(identity.value.orgRunId))
  const options = computed(() => ({ status: 'ready' as const, options: canonical.value?.modelOptions ?? null }))
  const eligible = computed(() => configured.value && canonical.value?.editability.editable && !canonical.value.isActive
    && owner.value?.phase === 'historical' && !owner.value.isActive && !store.operations[identity.value.orgRunId]
    && owner.value.getAgentContext(identity.value.agentRunId) === target.value.context && !target.value.context.submissionPending)
  const editable = computed(() => Boolean(eligible.value && !loading.value && !saving.value && !refreshRequired.value))
  const canSave = computed(() => Boolean(editable.value && canonical.value && selection.value && schema.value.status === 'ready'
    && !existingRunSelectionsEqual(canonical.value.launchConfiguration, selection.value)
    && selectionAllowed(canonical.value.launchConfiguration, selection.value, options.value)))
  const load = async () => {
    formGeneration.value += 1
    const token = ++generation, capturedKey = key.value, capturedOwner = owner.value
    const current = () => generation === token && capturedKey === key.value && capturedOwner === owner.value
    canonical.value = null; selection.value = null; feedback.value = ''; fieldErrors.value = []
    schema.value = { status: 'loading', message: null }; saving.value = false
    if (!configured.value) { loading.value = false; refreshRequired.value = false; return }
    loading.value = true
    try {
      const value = await store.readMemberModelConfig(identity.value)
      if (!current()) return
      canonical.value = value; selection.value = cloneExistingRunSelection(value.launchConfiguration); refreshRequired.value = false
    } catch (error) { if (current()) { refreshRequired.value = true; feedback.value = error instanceof Error ? error.message : String(error) } }
    finally { if (current()) loading.value = false }
  }
  const save = async () => {
    if (!canSave.value || !selection.value) return
    const token = generation, capturedKey = key.value, capturedOwner = owner.value
    const current = () => generation === token && capturedKey === key.value && capturedOwner === owner.value
    saving.value = true; feedback.value = ''; fieldErrors.value = []
    try {
      const result = await store.saveMemberModelConfig(identity.value, cloneExistingRunSelection(selection.value))
      if (!current()) return
      feedback.value = result.message; fieldErrors.value = result.fieldErrors
      if (result.outcome === 'PERSISTENCE_INDETERMINATE') { refreshRequired.value = true; feedback.value = t('workspace.runModelConfig.refreshRequired'); return }
      if (result.canonical && canonical.value) {
        canonical.value = { ...result.canonical, modelOptions: canonical.value.modelOptions }
        if (result.success) {
          selection.value = cloneExistingRunSelection(result.canonical.launchConfiguration)
          canonical.value.modelOptions = { currentModelIdentifier: result.canonical.launchConfiguration.llmModelIdentifier,
            currentContextTokens: null, replacements: [], unavailableReason: t('workspace.runModelConfig.capacityUnavailable') }
          // Refresh advisory options from the newly saved baseline, never replay the mutation.
          try {
            const refreshed = await store.readMemberModelConfig(identity.value)
            if (current()) { canonical.value = refreshed; selection.value = cloneExistingRunSelection(refreshed.launchConfiguration) }
          } catch { /* Verified saved values remain authoritative; replacements stay unavailable. */ }
        }
      } else refreshRequired.value = true
    } catch { if (current()) { refreshRequired.value = true; feedback.value = t('workspace.runModelConfig.refreshRequired') } }
    finally { if (current()) saving.value = false }
  }
  const updateSelection = (value: ExistingRunModelSelection) => { if (editable.value) {
    if (selection.value?.llmModelIdentifier !== value.llmModelIdentifier) { schema.value = { status: 'loading', message: null }; formGeneration.value += 1 }
    selection.value = cloneExistingRunSelection(value); fieldErrors.value = [] } }
  const setSchema = (value: ExistingRunModelConfigSchemaState) => { schema.value = value }
  watch([key, owner], () => { void load() }, { immediate: true })
  onBeforeUnmount(() => { generation += 1 })
  return { formGeneration, canonical, selection, options, configured, loading, saving, refreshRequired, feedback, fieldErrors, editable, canSave, load, save, updateSelection, setSchema }
}
