import { computed, type Ref } from 'vue'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import type { AgentContext } from '~/types/agent/AgentContext'
import { resolveFirstUserMessageSummary, resolveStoredTitleSummary } from '~/utils/runTreeSummary'
import { truncateChatTitle } from '~/utils/chat/chatDefaults'

/**
 * The run summary of a standalone agent run, as the Workspaces tree names it: the stored history
 * title, else the first user message while there is no stored title yet. Both read without the
 * skill-request prefix. `title` is truncated to 42 characters; `fullTitle` keeps the whole text.
 * Both are null until the run has a summary.
 */
export function useStandaloneRunTitle(context: Ref<AgentContext | null>) {
  const runHistoryStore = useRunHistoryStore()

  const historySummary = computed(() => {
    const runId = context.value?.state.runId
    if (!runId) return null
    for (const workspace of runHistoryStore.workspaceGroups) {
      for (const agent of workspace.agentDefinitions) {
        const run = agent.runs.find((entry) => entry.runId === runId)
        const stored = resolveStoredTitleSummary(run?.summary)
        if (stored) return stored
      }
    }
    return null
  })

  const fullTitle = computed(() => (context.value
    ? historySummary.value || resolveFirstUserMessageSummary(context.value.state.conversation) || null
    : null))
  const title = computed(() => (fullTitle.value ? truncateChatTitle(fullTitle.value) : null))

  return { title, fullTitle }
}
