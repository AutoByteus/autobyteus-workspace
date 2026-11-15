import type { AgentOrgRunHistoryItem } from '~/stores/runHistoryTypes'

/** An Org run's first configured member's address: where opening the Org's own row focuses. */
export const agentOrgFirstMemberAddress = (run: AgentOrgRunHistoryItem): string | null =>
  run.executionTree.rootOrg.members[0]?.address ?? null
