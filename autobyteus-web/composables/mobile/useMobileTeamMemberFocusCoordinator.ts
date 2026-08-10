import { computed, ref, type Ref } from 'vue'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useMobileWorkStore } from '~/stores/mobileWorkStore'
import type { AgentTeamMemberNode, TeamMemberNode } from '~/types/agent/AgentTeamContext'
import type { MobileWorkContext } from '~/types/mobileWork'
import {
  buildTeamMemberTreeFromDefinition,
  flattenLeafAgentMemberNodes,
} from '~/utils/teamDefinitionMembers'
import { createTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress'

export interface MobileTeamMemberFocusRow {
  memberAddress: string
  label: string
  detail: string
}

export const buildMobileTeamMemberFocusRows = (
  leafMembers: readonly AgentTeamMemberNode[],
  getAgentDefinitionName: (agentDefinitionId: string) => string | null,
): MobileTeamMemberFocusRow[] => leafMembers.map((member) => {
  const agentName = getAgentDefinitionName(member.agentDefinitionId)
  return {
    memberAddress: member.address,
    label: member.address.split('/').filter(Boolean).join(' › ') || member.displayName,
    detail: agentName || member.displayName,
  }
})

export function useMobileTeamMemberFocusCoordinator(contextRef: Ref<MobileWorkContext | null>) {
  const agentDefinitionStore = useAgentDefinitionStore()
  const teamDefinitionStore = useAgentTeamDefinitionStore()
  const teamContextsStore = useAgentTeamContextsStore()
  const runHistoryStore = useRunHistoryStore()
  const mobileWorkStore = useMobileWorkStore()
  const isUpdating = ref(false)
  const error = ref<string | null>(null)

  const teamContext = computed(() => {
    const context = contextRef.value
    if (context?.kind !== 'team-run') {
      return null
    }
    return teamContextsStore.getTeamContextById(context.teamRunId) || null
  })

  const definitionMemberTree = computed<TeamMemberNode[]>(() => {
    const context = contextRef.value
    if (context?.kind !== 'team-run') {
      return []
    }
    const definition = teamDefinitionStore.getAgentTeamDefinitionById(context.teamDefinitionId)
    if (!definition) {
      return []
    }
    try {
      return buildTeamMemberTreeFromDefinition(definition, {
        getTeamDefinitionById: (teamDefinitionId: string) =>
          teamDefinitionStore.getAgentTeamDefinitionById(teamDefinitionId),
      })
    } catch (cause) {
      console.error('[MobileTeamMemberFocus] Failed to build team member tree.', cause)
      return []
    }
  })

  const memberTree = computed(() => teamContext.value?.rootTeam.children || definitionMemberTree.value)
  const leafMembers = computed(() => flattenLeafAgentMemberNodes(memberTree.value))
  const memberRows = computed(() => buildMobileTeamMemberFocusRows(
    leafMembers.value,
    (agentDefinitionId) => agentDefinitionStore.getAgentDefinitionById(agentDefinitionId)?.name || null,
  ))
  const focusedMemberAddress = computed(() => {
    const context = contextRef.value
    if (context?.kind !== 'team-run') {
      return ''
    }
    return teamContext.value?.focusedExecutionAddress.memberAddress || context.focusedExecutionAddress.memberAddress || ''
  })
  const focusedMemberLabel = computed(() => (
    memberRows.value.find((row) => row.memberAddress === focusedMemberAddress.value)?.label
    || focusedMemberAddress.value
    || 'Choose member'
  ))

  async function focusMember(memberAddress: string): Promise<void> {
    const context = contextRef.value
    const normalizedMemberAddress = memberAddress.trim()
    error.value = null
    if (context?.kind !== 'team-run') {
      error.value = 'Open a team run before changing focused member.'
      throw new Error(error.value)
    }
    if (!memberRows.value.some((row) => row.memberAddress === normalizedMemberAddress)) {
      error.value = 'Choose a focusable team member.'
      throw new Error(error.value)
    }

    isUpdating.value = true
    try {
      const requestedAddress = createTeamExecutionAddress({
        rootTeamRunId: context.teamRunId,
        memberAddress: normalizedMemberAddress,
      })
      await runHistoryStore.focusTeamMemberAndEnsureHydrated(context.teamRunId, requestedAddress)
      const focused = teamContextsStore.getTeamContextById(context.teamRunId)?.focusedExecutionAddress
      if (!focused) throw new Error('Focused Team execution is unavailable.')
      mobileWorkStore.updateFocusedTeamMember(context.teamRunId, focused)
      mobileWorkStore.rememberFocusedTeamMember(context.teamRunId, focused)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Failed to change focused team member.'
      error.value = message
      throw cause
    } finally {
      isUpdating.value = false
    }
  }

  return {
    error,
    focusedMemberLabel,
    focusedMemberAddress,
    focusMember,
    isUpdating,
    memberRows,
  }
}
