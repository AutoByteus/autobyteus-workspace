import {
  teamMemberLaunchSource,
  type AgentLaunchConfigurationDto,
  type LaunchConfigurationSourceDto,
  type TaskExecutionDto as TeamTaskExecutionDto,
  type TeamRunExecutionTreeDto,
} from '@autobyteus/team-stream-contracts'
import {
  collaborationMemberLaunchSource,
  type CollaborationLaunchConfigurationSourceDto,
  type CollaborationTaskExecutionDto,
  type TaskAgentExecutionSourceDto,
} from '@autobyteus/collaboration-stream-contracts'
import type { RemoteAgentLaunchDto, RemoteTaskExecutionDto } from '@autobyteus/agent-presentation-contracts'
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
  type RunMemberRouting,
  type RunMemberTreeDeps,
} from '~/utils/runSettings/runMemberTree'

/**
 * DS-004 / REQ-007 (SR-006, SR-007): a run's open delegated copies as member rows.
 * One row per copy, with a badge; a Team row edits its Team-level choice and has its
 * agents as child rows. Each row shows what its run has (the launch it started with), with this edit's
 * unsaved choices applied by the draft rule (`draftLaunch`). Every value comes from the copy's own recorded source
 * (a copy of a configured placement records it too, with the `configured` origin: "As configured in this
 * run"). A row with a choice shows no origin; others say where their launch came from, with recorded
 * fallbacks as notes (a Team-level one once, on the Team row).
 * Model, its settings and its agent runtime are editable only while the copy is stopped; approval and
 * workspace never are. The copy itself carries the stop target. The rows are the view's child rows, the open ones
 * (autobyteus-461). Keys are `<address>@<run ID>`.
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
  /** The Model Router's choice (autobyteus-32): its task kind and reason. */
  routing?: Readonly<{ taskKind: string; reason: string }>
}>
/** Where a copy agent's decision is recorded on this node: the delegating run, the copy and the agent (D9). */
type DecisionLocator = NonNullable<RunMemberRouting['decision']>
/** An unsaved choice of this edit: its model and settings and, when it names one, its agent runtime. */
type Selection = Readonly<{ runtimeKind?: string; llmModelIdentifier: string; llmConfig: Record<string, unknown> | null }>
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
  /** What a target's run has since a Save in this Settings session (its own save answer, CR-461-077), if any. */
  savedOf(target: TargetKey): SavedSelection | null
}>
/** A saved choice always names its runtime. */
type SavedSelection = Selection & Readonly<{ runtimeKind: string }>
const NO_CONTROL: DelegatedRowControl = { editable: false, isAgentLive: () => false, isStopping: () => false, draftOf: () => null, savedOf: () => null }
/** The launch a row's run has: its record's, with what a Save in this session gave it (the run's own answer). */
const withSaved = (recorded: Launch, saved: SavedSelection | null): Launch => saved
  ? { autoExecuteTools: recorded?.autoExecuteTools ?? false, ...recorded, runtimeKind: saved.runtimeKind, llmModelIdentifier: saved.llmModelIdentifier, llmConfig: saved.llmConfig }
  : recorded
const LOCKED: RunSettingFlags = { workspace: true, model: true, thinking: true, approval: true }
const MODEL_EDITABLE: RunSettingFlags = { workspace: true, model: false, thinking: false, approval: true }

const valuesOf = (launch: Launch): RunSettingsValues => ({
  workspace: null,
  runtimeKind: launch?.runtimeKind ?? '',
  llmModelIdentifier: launch?.llmModelIdentifier ?? '',
  llmConfig: launch?.llmConfig ? { ...launch.llmConfig } : null,
  autoExecuteTools: launch?.autoExecuteTools ?? false,
})
const selectionOf = (launch: Launch): Selection & Readonly<{ runtimeKind: string }> => ({
  runtimeKind: launch?.runtimeKind ?? '',
  llmModelIdentifier: launch?.llmModelIdentifier ?? '',
  llmConfig: launch?.llmConfig ? { ...launch.llmConfig } : null,
})
/**
 * The draft rule: what a row runs with once this edit's unsaved choices apply (its own choice, else its Team's when it
 * follows the Team, else the launch its run has), and whether a choice decided it. Each saved choice is its run's own
 * launch (SR-039), so nothing else is layered on.
 */
const draftLaunch = (input: Readonly<{ started: Launch; followsTeam: boolean; team: Selection | null; agent: Selection | null }>):
  Readonly<{ launch: Launch; chosen: boolean }> => {
  const choice = input.agent ?? (input.followsTeam ? input.team : null)
  if (!input.started || !choice) return { launch: input.started, chosen: false }
  return { launch: { ...input.started, runtimeKind: choice.runtimeKind ?? input.started.runtimeKind,
    llmModelIdentifier: choice.llmModelIdentifier, llmConfig: choice.llmConfig }, chosen: true }
}
/**
 * A row's source label and the fallbacks it shows itself (`ownNotes` false: a member whose source is its Team's); a
 * Model Router choice also its task kind, reason and decision (autobyteus-32).
 */
const factsOf = (source: RecordedSource | null, ownNotes = true, badge?: RunMemberNode['badge'], decision: DecisionLocator | null = null): RunMemberLaunchFacts => ({
  ...(badge ? { badge } : {}),
  sourceKey: source?.origin ?? 'not_recorded',
  notes: ownNotes ? (source?.fallbacks ?? []).map((fallback): RunMemberNote => ({ kind: 'fallback', ...fallback })) : [],
  ...(source?.routing ? { routing: { decision, taskKind: source.routing.taskKind, reason: source.routing.reason } } : {}),
})
/** The decision locator of a copy agent: null when the copy's delegator was not recorded. */
const locatorOf = (delegator: string | null | undefined, copy: string, agent: string): DecisionLocator | null =>
  delegator ? { runId: delegator, copy, agent } : null

/** One row's control: its target and the choice applied, whether its copy runs, and its locks. */
type RowInput = Readonly<{
  key: string
  address: string
  /** An agent row's run ID (a Team row has none: a Team is never the focused agent). */
  agentRunId?: string
  /** The launch its run has. */
  started: Launch
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
const builders = (deps: RunMemberTreeDeps, control: DelegatedRowControl, nameOf: (address: string) => string) => {
  const rowFacts = (recordedInput: RowInput, isTeam: boolean) => {
    const input: RowInput = { ...recordedInput, started: withSaved(recordedInput.started, control.savedOf(recordedInput.target)) }
    // A Team row's card is the Team's choice; an agent follows the Team's choice only when it follows the Team.
    const followsTeam = isTeam || Boolean(input.followsTeam)
    const draftTeam = isTeam ? control.draftOf(input.target) : input.teamTarget ? control.draftOf(input.teamTarget) : null
    const draftAgent = isTeam ? null : control.draftOf(input.target)
    const current = draftLaunch({ started: input.started, followsTeam, team: draftTeam, agent: draftAgent })
    const stopping = input.stop ? control.isStopping(input.stop) : false
    const delegated: RunMemberDelegatedFacts = {
      target: input.target,
      original: selectionOf(input.started),
      stop: input.stop,
      running: input.running,
      stopping,
    }
    // A row with a user choice shows no origin (and so no router reason either).
    const { sourceKey, routing, ...facts } = input.facts
    return {
      values: valuesOf(current.launch),
      delegated,
      locked: control.editable && !input.running && !stopping ? MODEL_EDITABLE : LOCKED,
      launch: current.chosen ? facts : { ...facts, sourceKey, ...(routing ? { routing } : {}) },
    }
  }
  return {
    agent: (input: RowInput, isCoordinator = false): RunMemberNode => {
      const { values, ...rest } = rowFacts(input, false)
      return memberNode({ key: input.key, kind: 'agent', name: nameOf(input.address), agentRunId: input.agentRunId, isCoordinator, values, parentValues: values,
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
/** The configured layers a copy skipped (the Model Router's own failure is shown on the Model Routing page, not here). */
const configuredFallbacks = <T extends { layer: string }>(fallbacks: readonly T[]) =>
  fallbacks.filter((fallback): fallback is T & { layer: RunMemberLaunchFallback['layer'] } => fallback.layer !== 'model_router')
const snakeSource = (source: LaunchConfigurationSourceDto | null | undefined): RecordedSource | null => source ? {
  origin: source.origin,
  fallbacks: configuredFallbacks(source.fallbacks).map((fallback) => ({
    layer: fallback.layer, runtimeKind: fallback.runtime_kind, llmModelIdentifier: fallback.llm_model_identifier, detail: fallback.detail,
  })),
  ...(source.origin === 'model_router' ? { routing: { taskKind: source.task_kind, reason: source.choice_reason } } : {}),
} : null
export const teamDelegatedLaunchNodes = (
  tree: TeamRunExecutionTreeDto,
  deps: RunMemberTreeDeps,
  control: DelegatedRowControl = NO_CONTROL,
): RunMemberNode[] => {
  const build = builders(deps, control, (address) => teamMemberName(tree, address))
  const live = (ids: readonly string[]) => ids.some((id) => control.isAgentLive(id))
  const result: RunMemberNode[] = []
  const visit = (tasks: readonly TeamTaskExecutionDto[]): void => {
    for (const task of tasks) {
      if (task.kind === 'task_agent') {
        result.push(build.agent({ key: `${task.address}@${task.agent_run_id}`, address: task.address, agentRunId: task.agent_run_id,
          started: snakeLaunch(task.source.launch_configuration),
          target: `agent:${task.agent_run_id}`, stop: { agentRunId: task.agent_run_id }, running: live([task.agent_run_id]),
          facts: factsOf(snakeSource(task.source.launch_source), true, 'delegated_copy', locatorOf(task.delegator_agent_run_id, task.address, task.address)) }))
        continue
      }
      const source = task.source
      const teamStarted = snakeLaunch(source.default_launch_configuration)
      const teamTarget: TargetKey = `team:${task.team_run_id}`
      const running = live(task.members.map((member) => member.agent_run_id))
      const members = task.members.map((member) => {
        const recorded = source.members.find((candidate) => candidate.address === member.address)
        return build.agent({ key: `${member.address}@${member.agent_run_id}`, address: member.address, agentRunId: member.agent_run_id,
          started: snakeLaunch(recorded?.launch_configuration),
          followsTeam: recorded?.follows_team ?? false,
          target: `agent:${member.agent_run_id}`, teamTarget, stop: null, running,
          facts: factsOf(snakeSource(teamMemberLaunchSource(source, recorded ?? {})), Boolean(recorded?.launch_source), undefined,
            locatorOf(task.delegator_agent_run_id, task.address, member.address)) },
        member.address === source.coordinator_address)
      })
      result.push(build.team({ key: `${task.address}@${task.team_run_id}`, address: task.address, started: teamStarted,
        target: teamTarget, stop: { teamRunId: task.team_run_id }, running,
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
  fallbacks: configuredFallbacks(source.fallbacks).map(({ layer, runtimeKind, llmModelIdentifier, detail }) => ({ layer, runtimeKind, llmModelIdentifier, detail })),
  ...(source.origin === 'model_router' ? { routing: { taskKind: source.taskKind, reason: source.choiceReason } } : {}),
} : null
export const collaborationDelegatedLaunchNodes = (input: Readonly<{
  /** Every task-execution list of the root (see `collaborationTaskExecutionLists`). */
  taskExecutions: readonly CollaborationTaskExecutionDto[]
}>, deps: RunMemberTreeDeps, control: DelegatedRowControl = NO_CONTROL): RunMemberNode[] => {
  const build = builders(deps, control, memberDisplayName)
  const live = (ids: readonly string[]) => ids.some((id) => control.isAgentLive(id))
  const result: RunMemberNode[] = []
  const visit = (tasks: readonly CollaborationTaskExecutionDto[]): void => {
    for (const task of tasks) {
      if ('agentRunId' in task) {
        result.push(build.agent({ key: `${task.address}@${task.agentRunId}`, address: task.address, agentRunId: task.agentRunId,
          started: camelLaunch(task.source.launchConfiguration),
          target: `agent:${task.agentRunId}`, stop: { agentRunId: task.agentRunId }, running: live([task.agentRunId]),
          facts: factsOf(camelSource(task.source.launchSource), true, 'delegated_copy', locatorOf(task.delegatorAgentRunId, task.address, task.address)) }))
        continue
      }
      const source = task.source
      const teamStarted = camelLaunch(source.defaultLaunchConfiguration)
      const teamTarget: TargetKey = `team:${task.teamRunId}`
      const running = live(task.members.map((member) => member.agentRunId))
      const members = task.members.map((member) => {
        const recorded = source.members.find((candidate) => candidate.address === member.address)
        return build.agent({ key: `${member.address}@${member.agentRunId}`, address: member.address, agentRunId: member.agentRunId,
          started: camelLaunch(recorded?.launchConfiguration),
          followsTeam: recorded?.followsTeam ?? false,
          target: `agent:${member.agentRunId}`, teamTarget, stop: null, running,
          facts: factsOf(camelSource(collaborationMemberLaunchSource(source, recorded ?? {})), Boolean(recorded?.launchSource), undefined,
            locatorOf(task.delegatorAgentRunId, task.address, member.address)) },
        member.address === source.coordinatorAddress)
      })
      result.push(build.team({ key: `${task.address}@${task.teamRunId}`, address: task.address, started: teamStarted,
        target: teamTarget, stop: { teamRunId: task.teamRunId }, running,
        facts: factsOf(camelSource(source.defaultLaunchSource), true, 'delegated_copy') }, members))
      visit(task.taskExecutions)
    }
  }
  visit(input.taskExecutions)
  return result
}

// --- Where each row's Save goes (autobyteus-461 SR-064, rule 2) ---

/**
 * The run a delegated row's change is saved to, by that run's own stopped-run save: an agent row's own run; a Team row
 * the Team run at `/` (with its members that follow it); a Team member row the Team run at the member's address in the
 * Team run's own space.
 */
export type DelegatedSaveTarget =
  | Readonly<{ kind: 'agent'; agentRunId: string }>
  | Readonly<{ kind: 'team'; teamRunId: string; followerAddresses: readonly string[] }>
  | Readonly<{ kind: 'team_member'; teamRunId: string; memberAddress: string }>

type SaveTask = Readonly<{ agentRunId: string } | { teamRunId: string; members: readonly Readonly<{ address: string; agentRunId: string }>[];
  followerAddresses: readonly string[]; children: readonly SaveTask[] }>

const saveTargetsOf = (tasks: readonly SaveTask[]): ReadonlyMap<TargetKey, DelegatedSaveTarget> => {
  const targets = new Map<TargetKey, DelegatedSaveTarget>()
  const visit = (list: readonly SaveTask[]): void => {
    for (const task of list) {
      if ('agentRunId' in task) { targets.set(`agent:${task.agentRunId}`, Object.freeze({ kind: 'agent', agentRunId: task.agentRunId })); continue }
      targets.set(`team:${task.teamRunId}`, Object.freeze({ kind: 'team', teamRunId: task.teamRunId, followerAddresses: task.followerAddresses }))
      for (const member of task.members) {
        targets.set(`agent:${member.agentRunId}`, Object.freeze({ kind: 'team_member', teamRunId: task.teamRunId, memberAddress: member.address }))
      }
      visit(task.children)
    }
  }
  visit(tasks)
  return targets
}

/** A Team root's delegated rows' save targets (snake_case DTOs). */
export const teamDelegatedSaveTargets = (tree: TeamRunExecutionTreeDto): ReadonlyMap<TargetKey, DelegatedSaveTarget> => {
  const of = (tasks: readonly TeamTaskExecutionDto[]): SaveTask[] => tasks.map((task) => task.kind === 'task_agent' ? { agentRunId: task.agent_run_id }
    : { teamRunId: task.team_run_id, members: task.members.map((member) => ({ address: member.address, agentRunId: member.agent_run_id })),
      followerAddresses: task.source.members.filter((member) => member.follows_team).map((member) => member.address), children: of(task.task_executions) })
  return saveTargetsOf(of(tree.root_team.task_executions))
}

/** An Org or Agent root's delegated rows' save targets (camelCase DTOs). */
export const collaborationDelegatedSaveTargets = (taskExecutions: readonly CollaborationTaskExecutionDto[]): ReadonlyMap<TargetKey, DelegatedSaveTarget> => {
  const of = (tasks: readonly CollaborationTaskExecutionDto[]): SaveTask[] => tasks.map((task) => 'agentRunId' in task ? { agentRunId: task.agentRunId }
    : { teamRunId: task.teamRunId, members: task.members.map((member) => ({ address: member.address, agentRunId: member.agentRunId })),
      followerAddresses: task.source.members.filter((member) => member.followsTeam).map((member) => member.address), children: of(task.taskExecutions) })
  return saveTargetsOf(of(taskExecutions))
}

// --- Copies another node runs (autobyteus-32 REQ-009) ---

const remoteSource = (source: RemoteAgentLaunchDto['source']): RecordedSource => ({
  origin: source.origin,
  fallbacks: configuredFallbacks(source.fallbacks).map((fallback) => ({
    layer: fallback.layer, runtimeKind: fallback.runtime_kind, llmModelIdentifier: fallback.llm_model_identifier, detail: fallback.detail,
  })),
  ...(source.origin === 'model_router' ? { routing: { taskKind: source.task_kind, reason: source.choice_reason } } : {}),
})

/**
 * Read-only rows for the copies the run delegated to other nodes, from the launches each node answered: an Agent, or a
 * Team with its members. Each carries its node's name; a router choice its task kind and reason (its decision is on
 * that node, so no "View decision"). Links recorded before autobyteus-32 have no launches and no row, as before.
 */
export const remoteDelegatedLaunchNodes = (executions: readonly RemoteTaskExecutionDto[], deps: RunMemberTreeDeps): RunMemberNode[] =>
  executions.flatMap((execution): RunMemberNode[] => {
    const launches = execution.launches ?? []
    if (!launches.length) return []
    const rowOf = (launch: RemoteAgentLaunchDto, badge?: RunMemberNode['badge'], isCoordinator = false): RunMemberNode => {
      const values = valuesOf({ runtimeKind: launch.runtime_kind, llmModelIdentifier: launch.llm_model_identifier, llmConfig: null, autoExecuteTools: true })
      const agentRunId = execution.kind === 'agent' ? execution.agent_run_id
        : execution.members.find((member) => member.address === launch.address)?.agent_run_id
      return memberNode({ key: `${launch.address}@${execution.node_id}`, kind: 'agent', name: memberDisplayName(launch.address), agentRunId, isCoordinator,
        values, parentValues: values, fields: MEMBER_RUN_SETTING_FIELDS, locked: LOCKED,
        launch: { ...factsOf(remoteSource(launch.source), true, badge), remoteNode: execution.node_name } }, deps)
    }
    if (execution.kind === 'agent') return [rowOf(launches[0]!, 'delegated_copy')]
    const members = launches.map((launch) => rowOf(launch, undefined, launch.address === execution.coordinator_address))
    const coordinator = launches.find((launch) => launch.address === execution.coordinator_address) ?? launches[0]!
    const values = valuesOf({ runtimeKind: coordinator.runtime_kind, llmModelIdentifier: coordinator.llm_model_identifier, llmConfig: null, autoExecuteTools: true })
    return [memberNode({ key: `${execution.address}@${execution.node_id}`, kind: 'team', name: memberDisplayName(execution.address),
      values, parentValues: values, fields: MEMBER_RUN_SETTING_FIELDS, locked: LOCKED, children: members,
      launch: { badge: 'delegated_copy', notes: [], remoteNode: execution.node_name } }, deps)]
  })

/** Every agent run ID in a Team or Org execution tree (both casings), to find the remote runs its agents delegated. */
export const agentRunIdsOf = (tree: unknown): ReadonlySet<string> => {
  const ids = new Set<string>()
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) { value.forEach(visit); return }
    if (!value || typeof value !== 'object') return
    for (const [key, entry] of Object.entries(value)) {
      if ((key === 'agent_run_id' || key === 'agentRunId') && typeof entry === 'string') ids.add(entry)
      else visit(entry)
    }
  }
  visit(tree)
  return ids
}

/** Rows (at any depth) by key, for edits and options. */
export const delegatedRowsByKey = (rows: readonly RunMemberNode[]): ReadonlyMap<string, RunMemberNode> => {
  const map = new Map<string, RunMemberNode>()
  const visit = (nodes: readonly RunMemberNode[]): void => nodes.forEach((node) => { map.set(node.key, node); visit(node.children) })
  visit(rows)
  return map
}
