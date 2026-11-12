import { getApolloClient } from '~/utils/apolloClient'
import { TerminateAgentRun } from '~/graphql/mutations/agentMutations'
import { TerminateAgentTeamRun } from '~/graphql/mutations/agentTeamRunMutations'
import { AgentRunModelOptions, TeamRunModelOptions } from '~/graphql/queries/runModelOptionsQueries'
import { optionsStateOfAnswer } from './existingRunModelOptionsState'
import { updateStoppedAgentSelection, updateStoppedTeamSelections } from './existingRunModelConfigMutationClient'
import type { ExistingTeamModelConfigPatch } from './existingTeamModelConfigDraft'
import type { DelegatedSaveTarget } from '~/utils/runSettings/delegatedLaunchRows'
import type {
  ExistingRunModelConfigFieldError,
  ExistingRunModelOptionsAnswer,
  ExistingRunModelOptionsState,
  ExistingAgentRunSelection,
} from '~/types/agent/ExistingRunModelConfigDraft'

/**
 * A delegator's Settings on the runs it delegated to (autobyteus-461 rule 2, SR-064, SR-065, SR-066). Each delegated run
 * is reached as itself: its model options by its own query, its change by its own stopped-run save, its Stop by its own
 * terminate (a run on a peer node too: the server sends it to its node). Nothing goes through the delegator.
 */

/** The root a delegated run's row belongs to, as the server names its kind (the rows' grouping only). */
export type DelegatedRootKind = 'AGENT' | 'AGENT_TEAM' | 'AGENT_ORG'
export type DelegatedRoot = Readonly<{ rootKind: DelegatedRootKind; rootRunId: string }>

/** One delegated run: an agent (`agentRunId`) or a Team (`teamRunId`). */
export type DelegatedReference = Readonly<{ agentRunId: string }> | Readonly<{ teamRunId: string }>
/** A row's choice: an agent's own, or a Team's (its followers follow it). */
export type DelegatedTargetKey = `agent:${string}` | `team:${string}`

export const delegatedTargetKey = (reference: DelegatedReference): DelegatedTargetKey =>
  'agentRunId' in reference ? `agent:${reference.agentRunId}` : `team:${reference.teamRunId}`

export type DelegatedSaveResult = Readonly<{
  success: boolean
  message: string
  fieldErrors: readonly ExistingRunModelConfigFieldError[]
}>

type MutationResult = Readonly<{ success: boolean; message: string }>
const required = <T>(response: { data?: Record<string, T> | null; errors?: readonly { message: string }[] }, field: string): T => {
  if (response.errors?.length) throw new Error(response.errors.map((error) => error.message).join(', '))
  const result = response.data?.[field]
  if (!result) throw new Error('The server returned no result.')
  return result
}

/** Stops a delegated run as itself (`terminateAgentRun` / `terminateAgentTeamRun`); the answer's message on a refusal. */
export const terminateDelegatedRun = async (reference: DelegatedReference): Promise<MutationResult> => 'agentRunId' in reference
  ? required(await getApolloClient().mutate<Record<string, MutationResult>>({ mutation: TerminateAgentRun, variables: { agentRunId: reference.agentRunId } }), 'terminateAgentRun')
  : required(await getApolloClient().mutate<Record<string, MutationResult>>({ mutation: TerminateAgentTeamRun, variables: { teamRunId: reference.teamRunId } }), 'terminateAgentTeamRun')

const isAnswer = (row: Partial<ExistingRunModelOptionsAnswer> | null | undefined): row is ExistingRunModelOptionsAnswer =>
  Boolean(row && typeof row.currentModelIdentifier === 'string' && typeof row.modelListReadable === 'boolean' && Array.isArray(row.replacements))

/**
 * Each delegated row's model options, from its own run's query (SR-065): an agent's `AgentRunModelOptions`; a Team's and
 * its members' one `TeamRunModelOptions` (at `/` and at each member's address). A run whose options cannot be read is
 * left out, so the rows already shown keep theirs; `complete` is false then.
 */
export const loadDelegatedRunOptions = async (targets: ReadonlyMap<DelegatedTargetKey, DelegatedSaveTarget>):
  Promise<Readonly<{ options: Record<DelegatedTargetKey, ExistingRunModelOptionsState>; complete: boolean }>> => {
  const options: Record<DelegatedTargetKey, ExistingRunModelOptionsState> = {}
  let complete = true
  const teams = new Map<string, Array<[DelegatedTargetKey, string]>>()
  const agents: Array<[DelegatedTargetKey, string]> = []
  for (const [key, target] of targets) {
    if (target.kind === 'agent') agents.push([key, target.agentRunId])
    else teams.set(target.teamRunId, [...teams.get(target.teamRunId) ?? [], [key, target.kind === 'team' ? '/' : target.memberAddress]])
  }
  await Promise.all([
    ...agents.map(async ([key, agentRunId]) => {
      try {
        const { data, errors } = await getApolloClient().query<{ agentRunModelOptions?: ExistingRunModelOptionsAnswer }>({
          query: AgentRunModelOptions, variables: { agentRunId }, fetchPolicy: 'network-only' })
        if (errors?.length || !isAnswer(data?.agentRunModelOptions)) throw new Error('Model options unavailable.')
        options[key] = optionsStateOfAnswer(data!.agentRunModelOptions!)
      } catch { complete = false }
    }),
    ...[...teams].map(async ([teamRunId, scopes]) => {
      try {
        const { data, errors } = await getApolloClient().query<{ teamRunModelOptions?: (ExistingRunModelOptionsAnswer & { scopeAddress: string })[] }>({
          query: TeamRunModelOptions, variables: { teamRunId }, fetchPolicy: 'network-only' })
        const rows = data?.teamRunModelOptions
        if (errors?.length || !rows || !rows.every(isAnswer)) throw new Error('Model options unavailable.')
        for (const [key, address] of scopes) {
          const row = rows.find((candidate) => candidate.scopeAddress === address)
          if (row) { const { scopeAddress: _address, ...answer } = row; options[key] = optionsStateOfAnswer(answer) }
        }
      } catch { complete = false }
    }),
  ])
  return { options, complete }
}

type Change = Readonly<{ key: DelegatedTargetKey; selection: ExistingAgentRunSelection }>
/** One run's save: an agent run's selection, or a Team run's patches (its own at `/`, its members at their addresses). */
type RunSave = Readonly<{ kind: 'agent'; agentRunId: string; selection: ExistingAgentRunSelection; keys: readonly DelegatedTargetKey[] }>
  | Readonly<{ kind: 'team'; teamRunId: string; patches: ExistingTeamModelConfigPatch[]; keys: DelegatedTargetKey[] }>

/** The changes as one save per run, in row order; a Team's choice reaches its followers without their own choice. */
const savesOf = (changes: readonly Change[], targets: ReadonlyMap<DelegatedTargetKey, DelegatedSaveTarget>): RunSave[] => {
  const saves: RunSave[] = []
  const teamSave = (teamRunId: string) => {
    let save = saves.find((candidate): candidate is Extract<RunSave, { kind: 'team' }> => candidate.kind === 'team' && candidate.teamRunId === teamRunId)
    if (!save) { save = { kind: 'team', teamRunId, patches: [], keys: [] }; saves.push(save) }
    return save
  }
  const own = new Set(changes.map((change) => change.key))
  for (const { key, selection } of changes) {
    const target = targets.get(key)
    if (!target) throw new Error('A changed row is no longer shown; refresh and try again.')
    if (target.kind === 'agent') { saves.push({ kind: 'agent', agentRunId: target.agentRunId, selection, keys: [key] }); continue }
    const save = teamSave(target.teamRunId)
    save.keys.push(key)
    const patch = (scopeKind: ExistingTeamModelConfigPatch['scopeKind'], scopeAddress: string) =>
      save.patches.push({ scopeKind, scopeAddress, runtimeKind: selection.runtimeKind, llmModelIdentifier: selection.llmModelIdentifier, llmConfig: selection.llmConfig })
    if (target.kind === 'team_member') { patch('CONFIGURED_AGENT', target.memberAddress); continue }
    patch('CONFIGURED_TEAM', '/')
    const memberKeys = new Map([...targets].flatMap(([memberKey, candidate]) =>
      candidate.kind === 'team_member' && candidate.teamRunId === target.teamRunId ? [[candidate.memberAddress, memberKey] as const] : []))
    for (const address of target.followerAddresses) {
      const memberKey = memberKeys.get(address)
      if (!memberKey || !own.has(memberKey)) patch('CONFIGURED_AGENT', address)
    }
  }
  return saves
}

/**
 * The delegated rows' changes, each saved by its own run's stopped-run save, in row order (SR-064). A run that refuses
 * stops the Save there: the result names it, and the runs already saved (each keeps its save; its file is its truth).
 */
export const saveDelegatedRuns = async (input: Readonly<{
  changes: readonly Change[]
  targets: ReadonlyMap<DelegatedTargetKey, DelegatedSaveTarget>
  nameOf(key: DelegatedTargetKey): string
}>): Promise<DelegatedSaveResult> => {
  const saved: string[] = []
  const savedNote = () => saved.length ? ` Saved: ${saved.join(', ')}.` : ''
  for (const save of savesOf(input.changes, input.targets)) {
    const names = save.keys.map(input.nameOf).join(', ')
    let result: Readonly<{ success: boolean; message: string; fieldErrors: readonly ExistingRunModelConfigFieldError[] }>
    try {
      result = save.kind === 'agent'
        ? await updateStoppedAgentSelection({ agentRunId: save.agentRunId, ...save.selection })
        : await updateStoppedTeamSelections({ teamRunId: save.teamRunId, selectionPatches: save.patches })
    } catch (error) {
      return { success: false, message: `${names} was not saved: ${error instanceof Error ? error.message : String(error)}.${savedNote()}`, fieldErrors: [] }
    }
    if (!result.success) return { success: false, message: `${names} was not saved: ${result.message}${savedNote()}`, fieldErrors: [...result.fieldErrors] }
    saved.push(names)
  }
  return { success: true, message: 'Saved. The new models are used when each run resumes.', fieldErrors: [] }
}
