import { planExistingAgentOrgWorkspacePatches } from './existingAgentOrgWorkspaceDraft'
import type { ExistingRunConfigDraft } from '~/types/agent/ExistingRunConfigDraft'
import { getApolloClient } from '~/utils/apolloClient'
import { AgentOrgRunModelOptions, AgentRunModelOptions, TeamRunModelOptions } from '~/graphql/queries/runModelOptionsQueries'
import type { ExistingRunModelOptions, ExistingRunModelOptionsState } from '~/types/agent/ExistingRunModelConfigDraft'
export async function loadExistingRunModelOptions(draft: ExistingRunConfigDraft): Promise<Record<string, ExistingRunModelOptionsState>> {
  const { data, errors } = await getApolloClient().query<{
    agentRunModelOptions?: ExistingRunModelOptions
    teamRunModelOptions?: (ExistingRunModelOptions & { scopeAddress: string })[]
    agentOrgRunModelOptions?: (ExistingRunModelOptions & { scopeAddress: string })[]
  }>({ query: draft.kind === 'agent' ? AgentRunModelOptions
      : draft.kind === 'team' ? TeamRunModelOptions : AgentOrgRunModelOptions,
    variables: draft.kind === 'agent' ? { agentRunId: draft.runId }
      : draft.kind === 'team' ? { teamRunId: draft.teamRunId } : { orgRunId: draft.orgRunId, teamWorkspacePatches: planExistingAgentOrgWorkspacePatches(draft.executionTree, draft.workspaceDraft) }, fetchPolicy: 'network-only' })
  if (errors?.length || !data) throw new Error('Model options unavailable.')
  const rows: (ExistingRunModelOptions & { scopeAddress: string })[] | undefined = draft.kind === 'agent' && data.agentRunModelOptions
    ? [{ ...data.agentRunModelOptions, scopeAddress: '/' }]
    : draft.kind === 'team' ? data.teamRunModelOptions : data.agentOrgRunModelOptions
  if (!rows || rows.some((row) => typeof row.currentModelIdentifier !== 'string' || !Array.isArray(row.replacements))) throw new Error('Model options unavailable.')
  return Object.fromEntries(rows.map(({ scopeAddress, ...options }) => [scopeAddress, { status: 'ready', options }]))
}
