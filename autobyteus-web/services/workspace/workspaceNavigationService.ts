import type { LocationQuery, LocationQueryRaw, LocationQueryValue, RouteLocationRaw } from 'vue-router'
import { openAgentRun } from '~/services/runOpen/agentRunOpenCoordinator'
import { openTeamRun } from '~/services/runOpen/teamRunOpenCoordinator'
import {
  ensureRunHistoryWorkspaceByRootPath,
  resolveRunHistoryWorkspaceMetadataByRootPath,
} from '~/stores/runHistoryLoadActions'
import type { WorkspaceExecutionLink } from '~/types/workspace/WorkspaceExecutionLink'

const EXECUTION_KIND_QUERY_KEY = 'workspaceExecutionKind'
const EXECUTION_RUN_ID_QUERY_KEY = 'workspaceExecutionRunId'
const EXECUTION_MEMBER_ADDRESS_QUERY_KEY = 'workspaceExecutionMemberAddress'

const toFirstQueryValue = (value: LocationQueryValue | LocationQueryValue[] | undefined): string => {
  if (Array.isArray(value)) {
    return (value[0] ?? '').trim()
  }
  return (value ?? '').trim()
}

export const createWorkspaceExecutionLinkSignature = (link: WorkspaceExecutionLink): string => (
  link.kind === 'agent'
    ? `agent:${link.runId}`
    : `team:${link.teamRunId}:${link.memberAddress ?? ''}`
)

export const buildWorkspaceExecutionRoute = (
  link: WorkspaceExecutionLink,
): RouteLocationRaw => ({
  path: '/workspace',
  query: {
    [EXECUTION_KIND_QUERY_KEY]: link.kind,
    [EXECUTION_RUN_ID_QUERY_KEY]: link.kind === 'agent' ? link.runId : link.teamRunId,
    ...(link.kind === 'team' && link.memberAddress
      ? { [EXECUTION_MEMBER_ADDRESS_QUERY_KEY]: link.memberAddress }
      : {}),
  },
})

export const parseWorkspaceExecutionLinkQuery = (
  query: LocationQuery,
): WorkspaceExecutionLink | null => {
  const kind = toFirstQueryValue(query[EXECUTION_KIND_QUERY_KEY])
  const runId = toFirstQueryValue(query[EXECUTION_RUN_ID_QUERY_KEY])
  const memberAddress = toFirstQueryValue(query[EXECUTION_MEMBER_ADDRESS_QUERY_KEY]) || null

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
      memberAddress,
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
  delete nextQuery[EXECUTION_MEMBER_ADDRESS_QUERY_KEY]
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

  await openTeamRun({
    teamRunId: link.teamRunId,
    memberAddress: link.memberAddress,
    resolveWorkspaceMetadataByRootPath: resolveRunHistoryWorkspaceMetadataByRootPath,
    ensureWorkspaceByRootPath: ensureRunHistoryWorkspaceByRootPath,
  })
}
