import { computed, watch } from 'vue'
import { useAgentContextsStore } from '~/stores/agentContextsStore'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore'
import { AgentStatus } from '~/types/agent/AgentStatus'

const TEMPORARY_RUN_ID_PREFIX = 'temp-'

/**
 * Keeps the selected standalone run's collaboration view in step with its host: the live
 * stream while the host runs (Initializing, Idle or Running), the stored view otherwise.
 * A stopped or crashed host is never restored by viewing.
 */
export function useAgentRunCollaborationSync(): void {
  const selection = useAgentSelectionStore()
  const agents = useAgentContextsStore()
  const collaboration = useAgentRunCollaborationStore()

  const host = computed(() => {
    if (selection.selectedType !== 'agent') return null
    const context = agents.activeRun
    const runId = context?.state.runId
    if (!context || !runId || runId.startsWith(TEMPORARY_RUN_ID_PREFIX)) return null
    const status = context.state.currentStatus
    return { runId, running: status !== AgentStatus.Offline && status !== AgentStatus.Error }
  })

  watch(() => host.value && `${host.value.runId}:${host.value.running}`, () => {
    if (host.value) collaboration.syncHost(host.value.runId, host.value.running)
  }, { immediate: true })
}
