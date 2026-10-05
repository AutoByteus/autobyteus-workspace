import type { LocationQuery, LocationQueryRaw, LocationQueryValue, RouteLocationRaw } from 'vue-router'
import { openAgentRun } from '~/services/runOpen/agentRunOpenCoordinator'
import { openTeamRun } from '~/services/runOpen/teamRunOpenCoordinator'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { useAgentSelectionStore, type WorkspaceSelectionIntent, type WorkspaceSelectionOutcome } from '~/stores/agentSelectionStore'
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

/** Standalone agent runs (including chats) open in the chat view. */
export const buildAgentRunChatRoute = (runId: string): RouteLocationRaw => ({
  path: '/chat',
  query: { id: runId },
})

/** The Org launch page (DEC-005: the existing configuration route); "+" adds the source run. */
export const buildAgentOrgLaunchRoute = (orgDefinitionId: string, sourceOrgRunId?: string | null): RouteLocationRaw => ({
  path: '/workspace',
  query: {
    rootSubjectKind: 'agent_org',
    definitionId: orgDefinitionId,
    ...(sourceOrgRunId ? { sourceOrgRunId } : {}),
    mode: 'configuration',
  },
})

/** Where an Org launch lands: the launched Org run view, where the user chooses an Agent or Team. */
export const buildAgentOrgActiveRoute = (orgDefinitionId: string, orgRunId: string): RouteLocationRaw => ({
  path: '/workspace',
  query: { rootSubjectKind: 'agent_org', definitionId: orgDefinitionId, orgRunId, mode: 'active' },
})

export const createWorkspaceExecutionLinkSignature =(link: WorkspaceExecutionLink): string => (
  link.kind === 'agent'
    ? `agent:${link.runId}`
    : `team:${link.teamRunId}:${link.agentRunId ?? ''}`
)

/**
 * The single route authority for opening a run: standalone agent runs open in the chat view,
 * team runs (and their members) in the existing workspace Team view.
 */
export const buildWorkspaceExecutionRoute = (
  link: WorkspaceExecutionLink,
): RouteLocationRaw => (link.kind === 'agent'
  ? buildAgentRunChatRoute(link.runId)
  : {
      path: '/workspace',
      query: {
        [EXECUTION_KIND_QUERY_KEY]: link.kind,
        [EXECUTION_RUN_ID_QUERY_KEY]: link.teamRunId,
        ...(link.agentRunId ? { [EXECUTION_AGENT_RUN_ID_QUERY_KEY]: link.agentRunId } : {}),
      },
    })

export type RunSelectionRouteInput =
  | Readonly<{ type: 'agent'; runId: string }>
  | Readonly<{ type: 'team'; runId: string }>

/** Route for a committed run selection: agent → `/chat?id=`, team → `/workspace`. */
export const resolveSelectionRoute = (selection: RunSelectionRouteInput): RouteLocationRaw =>
  selection.type === 'agent' ? buildAgentRunChatRoute(selection.runId) : '/workspace'

/** Team execution links carried on `/workspace`; agent links are chat routes. */
export const parseWorkspaceExecutionLinkQuery = (
  query: LocationQuery,
): WorkspaceExecutionLink | null => {
  const kind = toFirstQueryValue(query[EXECUTION_KIND_QUERY_KEY])
  const runId = toFirstQueryValue(query[EXECUTION_RUN_ID_QUERY_KEY])
  const agentRunId = toFirstQueryValue(query[EXECUTION_AGENT_RUN_ID_QUERY_KEY]) || null

  if (kind !== 'team' || !runId) {
    return null
  }

  return {
    kind: 'team',
    teamRunId: runId,
    agentRunId,
  }
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
  selectionIntent?: WorkspaceSelectionIntent,
): Promise<WorkspaceSelectionOutcome> => {
  const intent = selectionIntent ?? useAgentSelectionStore().beginSelectionIntent()
  if (!intent.isCurrent()) return { disposition: 'superseded' }
  if (link.kind === 'agent') {
    return openAgentRun({
      selectionIntent: intent,
      runId: link.runId,
      fallbackAgentName: null,
      resolveWorkspaceMetadataByRootPath: resolveRunHistoryWorkspaceMetadataByRootPath,
      ensureWorkspaceByRootPath: ensureRunHistoryWorkspaceByRootPath,
    })
  }

  const mounted = useAgentTeamContextsStore().getTeamContextById(link.teamRunId)
  if (mounted && link.agentRunId) {
    const result = await useRunHistoryStore().inspectTeamMember(link.teamRunId, link.agentRunId, { selectionIntent: intent })
    if (result.disposition === 'rejected') throw new Error(result.message)
    return result
  }
  if (mounted) {
    useAgentSelectionStore().selectRun(link.teamRunId, 'team')
    return { disposition: 'committed' }
  }
  if (link.agentRunId) {
    return useRunHistoryStore().openTeamMemberRun(link.teamRunId, link.agentRunId, { selectionIntent: intent })
  }
  return openTeamRun({
    selectionIntent: intent,
    teamRunId: link.teamRunId,
    agentRunId: link.agentRunId,
    resolveWorkspaceMetadataByRootPath: resolveRunHistoryWorkspaceMetadataByRootPath,
    ensureWorkspaceByRootPath: ensureRunHistoryWorkspaceByRootPath,
  })
}
