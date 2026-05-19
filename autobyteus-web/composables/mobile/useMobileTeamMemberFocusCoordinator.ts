import { computed, ref, type Ref } from 'vue'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useMobileWorkStore } from '~/stores/mobileWorkStore'
import type { AgentTeamMemberNode, TeamMemberNode } from '~/types/agent/AgentTeamContext'
import type { MobileWorkContext } from '~/types/mobileWork'
import {
  buildTeamMemberTreeFromDefinition,
  flattenLeafAgentMemberNodes,
} from '~/utils/teamDefinitionMembers'

export interface MobileTeamMemberFocusRow {
  routeKey: string
  label: string
  detail: string
}

export const buildMobileTeamMemberFocusRows = (
  leafMembers: readonly AgentTeamMemberNode[],
  getAgentDefinitionName: (agentDefinitionId: string) => string | null,
): MobileTeamMemberFocusRow[] => leafMembers.map((member) => {
  const agentName = getAgentDefinitionName(member.agentDefinitionId)
  return {
    routeKey: member.memberRouteKey,
    label: member.memberPath.join(' › ') || member.memberName,
    detail: agentName || member.displayName || member.memberName,
  }
})

export function useMobileTeamMemberFocusCoordinator(contextRef: Ref<MobileWorkContext | null>) {
  const agentDefinitionStore = useAgentDefinitionStore()
  const teamDefinitionStore = useAgentTeamDefinitionStore()
  const teamContextsStore = useAgentTeamContextsStore()
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

  const memberTree = computed(() => teamContext.value?.memberTree || definitionMemberTree.value)
  const leafMembers = computed(() => flattenLeafAgentMemberNodes(memberTree.value))
  const memberRows = computed(() => buildMobileTeamMemberFocusRows(
    leafMembers.value,
    (agentDefinitionId) => agentDefinitionStore.getAgentDefinitionById(agentDefinitionId)?.name || null,
  ))
  const focusedMemberRouteKey = computed(() => {
    const context = contextRef.value
    if (context?.kind !== 'team-run') {
      return ''
    }
    return teamContext.value?.focusedMemberRouteKey || context.focusedMemberRouteKey || ''
  })
  const focusedMemberLabel = computed(() => (
    memberRows.value.find((row) => row.routeKey === focusedMemberRouteKey.value)?.label
    || focusedMemberRouteKey.value
    || 'Choose member'
  ))

  async function focusMember(memberRouteKey: string): Promise<void> {
    const context = contextRef.value
    const normalizedMemberRouteKey = memberRouteKey.trim()
    error.value = null
    if (context?.kind !== 'team-run') {
      error.value = 'Open a team run before changing focused member.'
      throw new Error(error.value)
    }
    if (!memberRows.value.some((row) => row.routeKey === normalizedMemberRouteKey)) {
      error.value = 'Choose a focusable team member.'
      throw new Error(error.value)
    }

    isUpdating.value = true
    try {
      await teamContextsStore.focusMemberAndEnsureHydrated(context.teamRunId, normalizedMemberRouteKey)
      mobileWorkStore.updateFocusedTeamMember(context.teamRunId, normalizedMemberRouteKey)
      mobileWorkStore.rememberFocusedTeamMember(context.teamRunId, normalizedMemberRouteKey)
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
    focusedMemberRouteKey,
    focusMember,
    isUpdating,
    memberRows,
  }
}
