import { getApolloClient } from '~/utils/apolloClient'
import { StopDelegatedExecution, UpdateDelegatedLaunchSelections } from '~/graphql/mutations/delegatedLaunchMutations'
import { DelegatedLaunchModelOptions } from '~/graphql/queries/runModelOptionsQueries'
import type {
  ExistingRunModelConfigFieldError,
  ExistingRunModelOptions,
  ExistingRunModelOptionsState,
  ExistingRunModelSelection,
} from '~/types/agent/ExistingRunModelConfigDraft'

/** The root a delegated copy or collaborator belongs to, as the server names its kind. */
export type DelegatedRootKind = 'AGENT' | 'AGENT_TEAM' | 'AGENT_ORG'
export type DelegatedRoot = Readonly<{ rootKind: DelegatedRootKind; rootRunId: string }>

/** One copy or collaborator: an agent (`agentRunId`) or a Team (`teamRunId`). */
export type DelegatedReference = Readonly<{ agentRunId: string }> | Readonly<{ teamRunId: string }>
/** Where a user model choice is recorded: an agent's own, or a Team's (its followers resolve to it). */
export type DelegatedTargetKey = `agent:${string}` | `team:${string}`

export const delegatedTargetKey = (reference: DelegatedReference): DelegatedTargetKey =>
  'agentRunId' in reference ? `agent:${reference.agentRunId}` : `team:${reference.teamRunId}`
export const delegatedReferenceOf = (key: DelegatedTargetKey): DelegatedReference =>
  key.startsWith('agent:') ? { agentRunId: key.slice('agent:'.length) } : { teamRunId: key.slice('team:'.length) }

/** A stopped run's own setting saved in the same Save (AR-004); an Agent run's own model is scope '/'. */
export type DelegatedConfiguredPatch = Readonly<{
  scopeKind: string
  scopeAddress: string
  llmModelIdentifier: string
  llmConfig: Record<string, unknown> | null
}>

export type DelegatedStopResult = Readonly<{
  success: boolean
  outcome: 'STOPPED' | 'ALREADY_STOPPED' | 'NOT_FOUND' | 'ROOT_NOT_ACTIVE' | 'INTERNAL_ERROR' | string
  message: string
  notStoppedUnattributed: number
}>

export type DelegatedSaveResult = Readonly<{
  success: boolean
  outcome: string
  message: string
  fieldErrors: readonly ExistingRunModelConfigFieldError[]
}>

const required = <T>(response: { data?: Record<string, T> | null; errors?: readonly { message: string }[] }, field: string): T => {
  if (response.errors?.length) throw new Error(response.errors.map((error) => error.message).join(', '))
  const result = response.data?.[field]
  if (!result) throw new Error('The server returned no result.')
  return result
}

export const stopDelegatedExecution = async (root: DelegatedRoot, reference: DelegatedReference): Promise<DelegatedStopResult> => {
  const response = await getApolloClient().mutate<Record<string, DelegatedStopResult>>({
    mutation: StopDelegatedExecution,
    variables: { input: { ...root, ...reference } },
  })
  return required(response, 'stopDelegatedExecution')
}

export const updateDelegatedLaunchSelections = async (input: DelegatedRoot & Readonly<{
  changes: readonly Readonly<{ key: DelegatedTargetKey; selection: ExistingRunModelSelection }>[]
  configuredPatches?: readonly DelegatedConfiguredPatch[]
}>): Promise<DelegatedSaveResult> => {
  const response = await getApolloClient().mutate<Record<string, DelegatedSaveResult>>({
    mutation: UpdateDelegatedLaunchSelections,
    variables: { input: {
      rootKind: input.rootKind,
      rootRunId: input.rootRunId,
      changes: input.changes.map(({ key, selection }) => ({ ...delegatedReferenceOf(key), selection })),
      ...(input.configuredPatches?.length ? { configuredPatches: input.configuredPatches } : {}),
    } },
  })
  return required(response, 'updateDelegatedLaunchSelections')
}

type OptionsRow = ExistingRunModelOptions & Readonly<{ scope: 'agent' | 'team'; agentRunId: string | null; teamRunId: string | null }>

/** Options of every editable copy and collaborator of the run, keyed by where its choice is recorded. */
export const loadDelegatedLaunchModelOptions = async (root: DelegatedRoot): Promise<Record<DelegatedTargetKey, ExistingRunModelOptionsState>> => {
  const { data, errors } = await getApolloClient().query<{ delegatedLaunchModelOptions?: OptionsRow[] }>({
    query: DelegatedLaunchModelOptions, variables: root, fetchPolicy: 'network-only',
  })
  const rows: OptionsRow[] | undefined = data?.delegatedLaunchModelOptions
  if (errors?.length || !rows || rows.some((row: OptionsRow) => typeof row.currentModelIdentifier !== 'string' || !Array.isArray(row.replacements))) {
    throw new Error('Model options unavailable.')
  }
  return Object.fromEntries(rows.map(({ scope, agentRunId, teamRunId, ...options }: OptionsRow) => [
    scope === 'agent' ? `agent:${agentRunId}` : `team:${teamRunId}`, { status: 'ready', options },
  ])) as Record<DelegatedTargetKey, ExistingRunModelOptionsState>
}
