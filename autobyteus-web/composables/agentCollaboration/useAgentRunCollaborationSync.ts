import { computed, watch } from 'vue'
import { useAgentContextsStore } from '~/stores/agentContextsStore'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { AgentStatus } from '~/types/agent/AgentStatus'

const TEMPORARY_RUN_ID_PREFIX = 'temp-'

/**
 * Keeps the selected standalone run's collaboration view in step with its host: the view's stream is kept while the
 * run is selected, running or stopped (autobyteus-461 SR-045: a stopped run's children may still work), and the host's
 * running state (including Error with live compaction recovery) is passed on. Used by the desktop and the phone shell.
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
    return { runId, running: status !== AgentStatus.Offline
      && (status !== AgentStatus.Error || !!context.state.recoverableBlock) }
  })

  watch(() => host.value && `${host.value.runId}:${host.value.running}:${useWindowNodeContextStore().bindingRevision}`, () => {
    if (host.value) collaboration.syncRun(host.value.runId, host.value.running)
  }, { immediate: true })
}
