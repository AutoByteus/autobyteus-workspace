import type { LocationQuery, LocationQueryRaw, LocationQueryValue, RouteLocationRaw } from 'vue-router'
import { openAgentRun } from '~/services/runOpen/agentRunOpenCoordinator'
import { openTeamRun } from '~/services/runOpen/teamRunOpenCoordinator'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import {
  ensureRunHistoryWorkspaceByRootPath,
  resolveRunHistoryWorkspaceMetadataByRootPath,
} from '~/stores/runHistoryLoadActions'
import type { WorkspaceExecutionLink } from '~/types/workspace/WorkspaceExecutionLink'

const EXECUTION_KIND_QUERY_KEY = 'workspaceExecutionKind'
const EXECUTION_RUN_ID_QUERY_KEY = 'workspaceExecutionRunId'
const EXECUTION_AGENT_RUN_ID_QUERY_KEY = 'workspaceExecutionAgentRunId'

const toFirstQueryValue = (value: LocationQueryValue | LocationQueryValue[] | undefined): string => {
  if (Array.isArray(value)) {
    return (value[0] ?? '').trim()
  }
  return (value ?? '').trim()
}

export const createWorkspaceExecutionLinkSignature = (link: WorkspaceExecutionLink): string => (
  link.kind === 'agent'
    ? `agent:${link.runId}`
    : `team:${link.teamRunId}:${link.agentRunId ?? ''}`
)

export const buildWorkspaceExecutionRoute = (
  link: WorkspaceExecutionLink,
): RouteLocationRaw => ({
  path: '/workspace',
  query: {
    [EXECUTION_KIND_QUERY_KEY]: link.kind,
    [EXECUTION_RUN_ID_QUERY_KEY]: link.kind === 'agent' ? link.runId : link.teamRunId,
    ...(link.kind === 'team' && link.agentRunId
      ? { [EXECUTION_AGENT_RUN_ID_QUERY_KEY]: link.agentRunId }
      : {}),
  },
})

export const parseWorkspaceExecutionLinkQuery = (
  query: LocationQuery,
): WorkspaceExecutionLink | null => {
  const kind = toFirstQueryValue(query[EXECUTION_KIND_QUERY_KEY])
  const runId = toFirstQueryValue(query[EXECUTION_RUN_ID_QUERY_KEY])
  const agentRunId = toFirstQueryValue(query[EXECUTION_AGENT_RUN_ID_QUERY_KEY]) || null

  if (!kind || !runId) {
    return null
  }

  if (kind === 'agent') {
    return {
      kind: 'agent',
      runId,
    }
  }

  if (kind === 'team') {
    return {
      kind: 'team',
      teamRunId: runId,
      agentRunId,
    }
  }

  return null
}

export const stripWorkspaceExecutionLinkQuery = (
  query: LocationQuery,
): LocationQueryRaw => {
  const nextQuery: LocationQueryRaw = { ...query }
  delete nextQuery[EXECUTION_KIND_QUERY_KEY]
  delete nextQuery[EXECUTION_RUN_ID_QUERY_KEY]
  delete nextQuery[EXECUTION_AGENT_RUN_ID_QUERY_KEY]
  return nextQuery
}

export const openWorkspaceExecutionLink = async (
  link: WorkspaceExecutionLink,
): Promise<void> => {
  if (link.kind === 'agent') {
    await openAgentRun({
      runId: link.runId,
      fallbackAgentName: null,
      resolveWorkspaceMetadataByRootPath: resolveRunHistoryWorkspaceMetadataByRootPath,
      ensureWorkspaceByRootPath: ensureRunHistoryWorkspaceByRootPath,
    })
    return
  }

  const mounted = useAgentTeamContextsStore().getTeamContextById(link.teamRunId)
  if (mounted && link.agentRunId) {
    const result = await useRunHistoryStore().inspectTeamMember(link.teamRunId, link.agentRunId)
    if (result.disposition === 'rejected') throw new Error(result.message)
    return
  }
  if (mounted) {
    useAgentSelectionStore().selectRun(link.teamRunId, 'team')
    return
  }
  if (link.agentRunId) {
    await useRunHistoryStore().openTeamMemberRun(link.teamRunId, link.agentRunId)
    return
  }
  await openTeamRun({
    teamRunId: link.teamRunId,
    agentRunId: link.agentRunId,
    resolveWorkspaceMetadataByRootPath: resolveRunHistoryWorkspaceMetadataByRootPath,
    ensureWorkspaceByRootPath: ensureRunHistoryWorkspaceByRootPath,
  })
}
