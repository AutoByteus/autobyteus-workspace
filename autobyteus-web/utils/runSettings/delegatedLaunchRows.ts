import {
  teamCopyAgentLaunch,
  teamMemberLaunchSource,
  type AgentLaunchConfigurationDto,
  type LaunchConfigurationSourceDto,
  type TaskExecutionDto as TeamTaskExecutionDto,
  type TeamRunExecutionTreeDto,
  type UserLaunchSelectionDto,
} from '@autobyteus/team-stream-contracts'
import {
  collaborationCopyAgentLaunch,
  collaborationMemberLaunchSource,
  type CollaborationLaunchConfigurationSourceDto,
  type CollaborationTaskExecutionDto,
  type TaskAgentExecutionSourceDto,
  type UserLaunchSelectionDto as CamelSelectionDto,
} from '@autobyteus/collaboration-stream-contracts'
import type { TaskExecutionReference } from '~/utils/collaboration/taskExecutionClosure'
import { memberDisplayName } from '~/utils/collaboration/memberDisplayName'
import { teamMemberName } from '~/services/teamExecution/teamExecutionTreeSelectors'
import { MEMBER_RUN_SETTING_FIELDS, type RunSettingFlags, type RunSettingsValues } from '~/types/runSettings/RunSettings'
import {
  memberNode,
  type RunMemberDelegatedFacts,
  type RunMemberLaunchFacts,
  type RunMemberLaunchFallback,
  type RunMemberLaunchSource,
  type RunMemberNode,
  type RunMemberNote,
  type RunMemberTreeDeps,
} from '~/utils/runSettings/runMemberTree'

/**
 * DS-004 / REQ-007 (SR-006, SR-007): a run's open delegated copies as member rows.
 * One row per copy, with a badge; a Team row edits its Team-level choice and has its
 * agents as child rows. Each row shows what it runs with by the single launch rule (its own user
 * choice, else its Team's when it follows the Team, else its started value; the contract packages'
 * functions), with this edit's choices applied. Every value comes from the copy's own recorded source
 * (a copy of a configured placement records it too, with the `configured` origin: "As configured in this
 * run"). A row with a choice shows no origin; others say where their launch came from, with recorded
 * fallbacks as notes (a Team-level one once, on the Team row).
 * Model and its settings are editable only while the copy is stopped; runtime, approval and
 * workspace never are. The copy itself carries the stop target. Closed copies (Task
 * DONE or CANCELLED) are left out, with everything under one. Keys are `<address>@<run ID>`.
 */
type Launch = Readonly<{
  runtimeKind: string
  llmModelIdentifier: string
  llmConfig: Readonly<Record<string, unknown>> | null
  autoExecuteTools: boolean
}> | null
type RecordedSource = Readonly<{
  origin: Exclude<RunMemberLaunchSource, 'not_recorded'>
  fallbacks: readonly RunMemberLaunchFallback[]
}>
type Selection = Readonly<{ llmModelIdentifier: string; llmConfig: Record<string, unknown> | null }>
type StopReference = NonNullable<RunMemberDelegatedFacts['stop']>
type TargetKey = RunMemberDelegatedFacts['target']

/** What the Settings container knows about the run's copies right now. */
export type DelegatedRowControl = Readonly<{
  /** The root lets the user change copies' models (not archived, not owned by an application, nothing in flight). */
  editable: boolean
  /** An agent of the run is live (not offline). */
  isAgentLive(agentRunId: string): boolean
  /** A stop of this copy is in flight. */
  isStopping(reference: StopReference): boolean
  /** This edit's choice for a target, if any. */
  draftOf(target: TargetKey): Selection | null
}>
const NO_CONTROL: DelegatedRowControl = { editable: false, isAgentLive: () => false, isStopping: () => false, draftOf: () => null }
const LOCKED: RunSettingFlags = { workspace: true, model: true, thinking: true, approval: true }
const MODEL_EDITABLE: RunSettingFlags = { workspace: true, model: false, thinking: false, approval: true }

const referenceKey = (reference: TaskExecutionReference): string =>
  'agentRunId' in reference ? `agent:${reference.agentRunId}` : `team:${reference.teamRunId}`
const valuesOf = (launch: Launch): RunSettingsValues => ({
  workspace: null,
  runtimeKind: launch?.runtimeKind ?? '',
  llmModelIdentifier: launch?.llmModelIdentifier ?? '',
  llmConfig: launch?.llmConfig ? { ...launch.llmConfig } : null,
  autoExecuteTools: launch?.autoExecuteTools ?? false,
})
const selectionOf = (launch: Launch): Selection => ({
  llmModelIdentifier: launch?.llmModelIdentifier ?? '',
  llmConfig: launch?.llmConfig ? { ...launch.llmConfig } : null,
})
/** The single launch rule (a contract function per DTO casing): what a row runs with, and whether a user choice decided it. */
type LaunchRule = (input: Readonly<{ started: Launch; followsTeam: boolean; team: Selection | null; agent: Selection | null }>) =>
  Readonly<{ launch: Launch; chosen: boolean }>
const snakeRule: LaunchRule = ({ started, followsTeam, team, agent }) => {
  if (!started) return { launch: null, chosen: false }
  const selection = (choice: Selection | null) => choice
    ? { llm_model_identifier: choice.llmModelIdentifier, llm_config: choice.llmConfig as UserLaunchSelectionDto['llm_config'], selected_at: '' }
    : null
  const { launch, selected } = teamCopyAgentLaunch({
    started: { runtime_kind: started.runtimeKind as AgentLaunchConfigurationDto['runtime_kind'], llm_model_identifier: started.llmModelIdentifier,
      llm_config: started.llmConfig as AgentLaunchConfigurationDto['llm_config'], auto_execute_tools: started.autoExecuteTools, workspace_root_path: null },
    followsTeam, teamSelection: selection(team), agentSelection: selection(agent),
  })
  return { launch: snakeLaunch(launch), chosen: selected !== null }
}
const camelRule: LaunchRule = ({ started, followsTeam, team, agent }) => {
  if (!started) return { launch: null, chosen: false }
  const selection = (choice: Selection | null) => choice
    ? { llmModelIdentifier: choice.llmModelIdentifier, llmConfig: choice.llmConfig as CamelSelectionDto['llmConfig'], selectedAt: '' }
    : null
  const { launch, selected } = collaborationCopyAgentLaunch({
    started: { runtimeKind: started.runtimeKind as CamelLaunch['runtimeKind'], llmModelIdentifier: started.llmModelIdentifier,
      llmConfig: started.llmConfig as CamelLaunch['llmConfig'], autoExecuteTools: started.autoExecuteTools, workspaceRootPath: null },
    followsTeam, teamSelection: selection(team), agentSelection: selection(agent),
  })
  return { launch: camelLaunch(launch), chosen: selected !== null }
}
/** A row's source label and the fallbacks it shows itself (`ownNotes` false: a member whose source is its Team's). */
const factsOf = (source: RecordedSource | null, ownNotes = true, badge?: RunMemberNode['badge']): RunMemberLaunchFacts => ({
  ...(badge ? { badge } : {}),
  sourceKey: source?.origin ?? 'not_recorded',
  notes: ownNotes ? (source?.fallbacks ?? []).map((fallback): RunMemberNote => ({ kind: 'fallback', ...fallback })) : [],
})

/** One row's control: its target and the choice applied, whether its copy runs, and its locks. */
type RowInput = Readonly<{
  key: string
  address: string
  /** The launch before any user choice. */
  started: Launch
  /** The user's choices recorded on the run (what it runs with now). */
  recorded: Readonly<{ agent?: Selection | null; team?: Selection | null }>
  followsTeam?: boolean
  target: TargetKey
  /** The Team-level target of a member row, whose draft also reaches a follower. */
  teamTarget?: TargetKey
  stop: StopReference | null
  running: boolean
  facts: RunMemberLaunchFacts
}>

/**
 * Nodes from neutral facts (both DTO casings), shaped like the run's own Members: a Team shows its settings card, then its agents.
 * `nameOf` is the root's naming rule, so a row is named as the sidebar and the conversation name the copy.
 */
const builders = (deps: RunMemberTreeDeps, control: DelegatedRowControl, rule: LaunchRule, nameOf: (address: string) => string) => {
  const rowFacts = (input: RowInput, isTeam: boolean) => {
    const recordedTeam = input.recorded.team ?? null
    const recordedAgent = isTeam ? null : input.recorded.agent ?? null
    // A Team row's card is the Team's choice; an agent follows the Team's choice only when it follows the Team.
    const followsTeam = isTeam || Boolean(input.followsTeam)
    const draftTeam = isTeam ? control.draftOf(input.target) : input.teamTarget ? control.draftOf(input.teamTarget) : null
    const draftAgent = isTeam ? null : control.draftOf(input.target)
    const original = rule({ started: input.started, followsTeam, team: recordedTeam, agent: recordedAgent })
    const current = rule({ started: input.started, followsTeam, team: draftTeam ?? recordedTeam, agent: draftAgent ?? recordedAgent })
    const stopping = input.stop ? control.isStopping(input.stop) : false
    const delegated: RunMemberDelegatedFacts = {
      target: input.target,
      original: selectionOf(original.launch),
      stop: input.stop,
      running: input.running,
      stopping,
    }
    const { sourceKey, ...facts } = input.facts
    return {
      values: valuesOf(current.launch),
      delegated,
      locked: control.editable && !input.running && !stopping ? MODEL_EDITABLE : LOCKED,
      launch: current.chosen ? facts : { ...facts, sourceKey },
    }
  }
  return {
    agent: (input: RowInput, isCoordinator = false): RunMemberNode => {
      const { values, ...rest } = rowFacts(input, false)
      return memberNode({ key: input.key, kind: 'agent', name: nameOf(input.address), isCoordinator, values, parentValues: values,
        fields: MEMBER_RUN_SETTING_FIELDS, ...rest }, deps)
    },
    team: (input: RowInput, children: readonly RunMemberNode[]): RunMemberNode => {
      const { values, ...rest } = rowFacts(input, true)
      return memberNode({ key: input.key, kind: 'team', name: nameOf(input.address), values, parentValues: values,
        fields: MEMBER_RUN_SETTING_FIELDS, children, ...rest }, deps)
    },
  }
}

// --- Team root (snake_case DTOs) ---

const snakeLaunch = (launch: AgentLaunchConfigurationDto | null | undefined): Launch => launch ? {
  runtimeKind: launch.runtime_kind, llmModelIdentifier: launch.llm_model_identifier,
  llmConfig: launch.llm_config, autoExecuteTools: launch.auto_execute_tools,
} : null
const snakeSource = (source: LaunchConfigurationSourceDto | null | undefined): RecordedSource | null => source ? {
  origin: source.origin,
  fallbacks: source.fallbacks.map((fallback) => ({
    layer: fallback.layer, runtimeKind: fallback.runtime_kind, llmModelIdentifier: fallback.llm_model_identifier, detail: fallback.detail,
  })),
} : null
const snakeChoice = (selection: UserLaunchSelectionDto | undefined): Selection | null => selection
  ? { llmModelIdentifier: selection.llm_model_identifier, llmConfig: selection.llm_config ? { ...selection.llm_config } : null }
  : null

export const teamDelegatedLaunchNodes = (
  tree: TeamRunExecutionTreeDto,
  closed: readonly TaskExecutionReference[],
  deps: RunMemberTreeDeps,
  control: DelegatedRowControl = NO_CONTROL,
): RunMemberNode[] => {
  const build = builders(deps, control, snakeRule, (address) => teamMemberName(tree, address))
  const live = (ids: readonly string[]) => ids.some((id) => control.isAgentLive(id))
  const closedKeys = new Set(closed.map(referenceKey))
  const result: RunMemberNode[] = []
  const visit = (tasks: readonly TeamTaskExecutionDto[]): void => {
    for (const task of tasks) {
      if (task.kind === 'task_agent') {
        if (closedKeys.has(`agent:${task.agent_run_id}`)) continue
        result.push(build.agent({ key: `${task.address}@${task.agent_run_id}`, address: task.address,
          started: snakeLaunch(task.source.launch_configuration),
          recorded: { agent: snakeChoice(task.user_launch_selection) },
          target: `agent:${task.agent_run_id}`, stop: { agentRunId: task.agent_run_id }, running: live([task.agent_run_id]),
          facts: factsOf(snakeSource(task.source.launch_source), true, 'delegated_copy') }))
        continue
      }
      if (closedKeys.has(`team:${task.team_run_id}`)) continue
      const source = task.source
      const teamStarted = snakeLaunch(source.default_launch_configuration)
      const teamChoice = snakeChoice(task.user_team_launch_selection)
      const teamTarget: TargetKey = `team:${task.team_run_id}`
      const running = live(task.members.map((member) => member.agent_run_id))
      const members = task.members.map((member) => {
        const recorded = source.members.find((candidate) => candidate.address === member.address)
        return build.agent({ key: `${member.address}@${member.agent_run_id}`, address: member.address,
          started: snakeLaunch(recorded?.launch_configuration),
          recorded: { agent: snakeChoice(member.user_launch_selection), team: teamChoice },
          followsTeam: recorded?.follows_team ?? false,
          target: `agent:${member.agent_run_id}`, teamTarget, stop: null, running,
          facts: factsOf(snakeSource(teamMemberLaunchSource(source, recorded ?? {})), Boolean(recorded?.launch_source)) },
        member.address === source.coordinator_address)
      })
      result.push(build.team({ key: `${task.address}@${task.team_run_id}`, address: task.address, started: teamStarted,
        recorded: { team: teamChoice }, target: teamTarget, stop: { teamRunId: task.team_run_id }, running,
        facts: factsOf(snakeSource(source.default_launch_source), true, 'delegated_copy') }, members))
      visit(task.task_executions)
    }
  }
  visit(tree.root_team.task_executions)
  return result
}

// --- Org and Agent roots (camelCase DTOs) ---

type CamelLaunch = TaskAgentExecutionSourceDto['launchConfiguration']
const camelLaunch = (launch: CamelLaunch | null | undefined): Launch => launch ? {
  runtimeKind: launch.runtimeKind, llmModelIdentifier: launch.llmModelIdentifier,
  llmConfig: launch.llmConfig, autoExecuteTools: launch.autoExecuteTools,
} : null
const camelSource = (source: CollaborationLaunchConfigurationSourceDto | null | undefined): RecordedSource | null => source ? {
  origin: source.origin,
  fallbacks: source.fallbacks.map(({ layer, runtimeKind, llmModelIdentifier, detail }) => ({ layer, runtimeKind, llmModelIdentifier, detail })),
} : null
const camelChoice = (selection: CamelSelectionDto | undefined): Selection | null => selection
  ? { llmModelIdentifier: selection.llmModelIdentifier, llmConfig: selection.llmConfig ? { ...selection.llmConfig } : null }
  : null

export const collaborationDelegatedLaunchNodes = (input: Readonly<{
  /** Every task-execution list of the root (see `collaborationTaskExecutionLists`). */
  taskExecutions: readonly CollaborationTaskExecutionDto[]
  closed?: readonly TaskExecutionReference[]
}>, deps: RunMemberTreeDeps, control: DelegatedRowControl = NO_CONTROL): RunMemberNode[] => {
  const build = builders(deps, control, camelRule, memberDisplayName)
  const live = (ids: readonly string[]) => ids.some((id) => control.isAgentLive(id))
  const closedKeys = new Set((input.closed ?? []).map(referenceKey))
  const result: RunMemberNode[] = []
  const visit = (tasks: readonly CollaborationTaskExecutionDto[]): void => {
    for (const task of tasks) {
      if ('agentRunId' in task) {
        if (closedKeys.has(`agent:${task.agentRunId}`)) continue
        result.push(build.agent({ key: `${task.address}@${task.agentRunId}`, address: task.address,
          started: camelLaunch(task.source.launchConfiguration),
          recorded: { agent: camelChoice(task.userLaunchSelection) },
          target: `agent:${task.agentRunId}`, stop: { agentRunId: task.agentRunId }, running: live([task.agentRunId]),
          facts: factsOf(camelSource(task.source.launchSource), true, 'delegated_copy') }))
        continue
      }
      if (closedKeys.has(`team:${task.teamRunId}`)) continue
      const source = task.source
      const teamStarted = camelLaunch(source.defaultLaunchConfiguration)
      const teamChoice = camelChoice(task.userTeamLaunchSelection)
      const teamTarget: TargetKey = `team:${task.teamRunId}`
      const running = live(task.members.map((member) => member.agentRunId))
      const members = task.members.map((member) => {
        const recorded = source.members.find((candidate) => candidate.address === member.address)
        return build.agent({ key: `${member.address}@${member.agentRunId}`, address: member.address,
          started: camelLaunch(recorded?.launchConfiguration),
          recorded: { agent: camelChoice(member.userLaunchSelection), team: teamChoice },
          followsTeam: recorded?.followsTeam ?? false,
          target: `agent:${member.agentRunId}`, teamTarget, stop: null, running,
          facts: factsOf(camelSource(collaborationMemberLaunchSource(source, recorded ?? {})), Boolean(recorded?.launchSource)) },
        member.address === source.coordinatorAddress)
      })
      result.push(build.team({ key: `${task.address}@${task.teamRunId}`, address: task.address, started: teamStarted,
        recorded: { team: teamChoice }, target: teamTarget, stop: { teamRunId: task.teamRunId }, running,
        facts: factsOf(camelSource(source.defaultLaunchSource), true, 'delegated_copy') }, members))
      visit(task.taskExecutions)
    }
  }
  visit(input.taskExecutions)
  return result
}

/** Rows (at any depth) by key, for edits and options. */
export const delegatedRowsByKey = (rows: readonly RunMemberNode[]): ReadonlyMap<string, RunMemberNode> => {
  const map = new Map<string, RunMemberNode>()
  const visit = (nodes: readonly RunMemberNode[]): void => nodes.forEach((node) => { map.set(node.key, node); visit(node.children) })
  visit(rows)
  return map
}
