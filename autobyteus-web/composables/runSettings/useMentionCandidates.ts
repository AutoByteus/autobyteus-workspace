import { computed, type Ref } from 'vue'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import {
  collaboratorCandidatesService,
  type CollaboratorMentionCandidate,
} from '~/services/collaborators/collaboratorCandidatesService'
import type { RunMentionScope } from '~/composables/agentInput/runMentionScope'
import { draftMentionCandidates, type DraftMentionTarget } from '~/utils/collaborators/draftMentionEligibility'

/**
 * Where a composer's `@` candidates come from:
 * - a live run: the server's candidates for its root, or for the focused agent of an Agent root
 *   (the server owns eligibility);
 * - a New chat draft: the same rule applied to the would-be run (`draftMentionEligibility`).
 */
export type MentionCandidateSource =
  | Readonly<{ kind: 'live_run'; scope: RunMentionScope }>
  | Readonly<{ kind: 'draft'; target: DraftMentionTarget; focusedName: string }>

export function useMentionCandidates(source: Ref<MentionCandidateSource | null>) {
  const agentStore = useAgentDefinitionStore()
  const teamStore = useAgentTeamDefinitionStore()

  const candidates = computed<readonly CollaboratorMentionCandidate[]>(() => {
    const current = source.value
    if (!current) return []
    if (current.kind === 'draft') {
      return draftMentionCandidates(current.target, {
        agents: agentStore.agentDefinitions,
        teams: teamStore.agentTeamDefinitions,
      })
    }
    const entry = collaboratorCandidatesService.entry(current.scope)
    return entry?.available === false ? [] : entry?.candidates ?? []
  })

  /** The agent that receives the message and delegates to the mentioned address (the menu footer). */
  const focusedName = computed(() => {
    const current = source.value
    if (!current) return ''
    return current.kind === 'draft' ? current.focusedName : current.scope.focusedName
  })

  /** Each opening asks again: the shared catalog (and the run's own definition) can change. */
  const refresh = (): void => {
    const current = source.value
    if (!current) return
    if (current.kind === 'live_run') {
      void collaboratorCandidatesService.refresh(current.scope)
      return
    }
    if (!agentStore.agentDefinitions.length) void agentStore.fetchAllAgentDefinitions().catch(() => undefined)
    if (!teamStore.agentTeamDefinitions.length) void teamStore.fetchAllAgentTeamDefinitions().catch(() => undefined)
  }

  return { available: computed(() => Boolean(source.value)), candidates, focusedName, refresh }
}
