import { computed, type Ref } from 'vue'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import type { AgentContext } from '~/types/agent/AgentContext'
import { resolveFirstUserMessageSummary } from '~/utils/runTreeSummary'
import { truncateChatTitle } from '~/utils/chat/chatDefaults'

/**
 * The run summary of a standalone agent run, as the Workspaces tree names it: the first user
 * message (skill-request prefix removed), else the history summary. `title` is truncated to 42
 * characters; `fullTitle` keeps the whole text. Both are null until the run has a summary.
 */
export function useStandaloneRunTitle(context: Ref<AgentContext | null>) {
  const runHistoryStore = useRunHistoryStore()

  const historySummary = computed(() => {
    const runId = context.value?.state.runId
    if (!runId) return null
    for (const workspace of runHistoryStore.workspaceGroups) {
      for (const agent of workspace.agentDefinitions) {
        const run = agent.runs.find((entry) => entry.runId === runId)
        if (run?.summary?.trim()) return run.summary.trim()
      }
    }
    return null
  })

  const fullTitle = computed(() => (context.value
    ? resolveFirstUserMessageSummary(context.value.state.conversation) || historySummary.value || null
    : null))
  const title = computed(() => (fullTitle.value ? truncateChatTitle(fullTitle.value) : null))

  return { title, fullTitle }
}
