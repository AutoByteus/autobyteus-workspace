import type { ActiveAgentWorkspaceTarget } from '~/types/workspace/activeAgentWorkspaceTarget'
import { memberDisplayName } from '~/utils/collaboration/memberDisplayName'
import type { CollaboratorCandidateSubject } from '~/services/collaborators/collaboratorCandidatesService'

/**
 * The live run a composer belongs to, for `@` mentions: its candidate subject (an Agent root's
 * candidates depend on the focused agent) and the focused agent's name.
 */
export type RunMentionScope = CollaboratorCandidateSubject & Readonly<{
  /** The agent the user is talking to; it receives the message and delegates to the mentioned address. */
  focusedName: string
}>

const TEMPORARY_RUN_ID_PREFIX = 'temp-'

/** `/research_team/product_manager` → `product manager`. */
export const memberNameOfAddress = memberDisplayName

/**
 * `@` is offered in every sendable live-run composer: a standalone Agent run, a Team member, an
 * Org member and any task child. A launch draft (New chat, an unsent Agent run) has no run yet.
 */
export const resolveRunMentionScope = (target: ActiveAgentWorkspaceTarget | null): RunMentionScope | null => {
  if (!target || target.access === 'read_only') return null
  switch (target.kind) {
    case 'standalone_agent': {
      const runId = target.context.state.runId
      if (!runId || runId.startsWith(TEMPORARY_RUN_ID_PREFIX)) return null
      return Object.freeze({
        rootKind: 'agent',
        rootRunId: runId,
        focusedAgentRunId: runId,
        focusedName: target.context.config?.agentDefinitionName?.trim() || memberNameOfAddress(runId),
      })
    }
    case 'standalone_team_member':
      return Object.freeze({
        rootKind: 'agent_team',
        rootRunId: target.team.rootRunId,
        focusedName: memberNameOfAddress(target.team.focusedMemberAddress),
      })
    case 'agent_run_task_agent':
    case 'agent_run_task_team_member':
      return Object.freeze({
        rootKind: 'agent',
        rootRunId: target.host.hostRunId,
        focusedAgentRunId: target.agentRunId,
        focusedName: memberNameOfAddress(target.address),
      })
    case 'agent_org_direct_agent':
    case 'agent_org_team_member':
    case 'agent_org_task_agent':
    case 'agent_org_task_team_member':
      return Object.freeze({
        rootKind: 'agent_org',
        rootRunId: target.root.orgRunId,
        focusedName: memberNameOfAddress(target.address),
      })
  }
}
