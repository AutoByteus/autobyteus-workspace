import type { CollaborationLaunchConfigurationSourceDto, RunTreeLaunchDto, RunTreeRowDto } from '@autobyteus/collaboration-stream-contracts'
import type { RunTreeRef } from '~/stores/runTreeStore'
import { MEMBER_RUN_SETTING_FIELDS, type RunSettingFlags, type RunSettingsValues } from '~/types/runSettings/RunSettings'
import { isTeamRow } from '~/utils/runTree/runTreeDisplayRows'
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
 * agents as child rows. Each row shows what its run has: its launch and origin as the server's tree row carries them,
 * read from the run itself (SR-084, CR-461-086 folded in; after a save, the tree's next answer), with this edit's
 * unsaved choices applied by the draft rule (`draftLaunch`). Every value comes from the copy's own recorded source
 * (a copy of a configured placement records it too, with the `configured` origin: "As configured in this
 * run"). A row with a choice shows no origin; others say where their launch came from, with recorded
 * fallbacks as notes (a Team-level one once, on the Team row).
 * Model, its settings and its agent runtime are editable only while the copy is stopped; approval and
 * workspace never are. The copy itself carries the stop target. The rows are the view's child rows, the open ones
 * (autobyteus-461). A row's key is its tree row's key, kept through refreshes (CR-461-095).
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
}>
const NO_CONTROL: DelegatedRowControl = { editable: false, isAgentLive: () => false, isStopping: () => false, draftOf: () => null }
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
 * The draft rule: what a row runs with once this edit's unsaved choice applies (its own choice, else the launch its run
 * has), and whether a choice decided it. Each saved choice is its run's own launch (SR-039): a Team row's choice is its
 * Team's default only, and each member keeps its own launch (CR-461-089, SR-075 F-39).
 */
const draftLaunch = (input: Readonly<{ started: Launch; choice: Selection | null }>): Readonly<{ launch: Launch; chosen: boolean }> => {
  const choice = input.choice
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

/** Where a row's launch came from, as its record says: its source, whether it is its own, its badge and router decision. */
type RowOrigin = Readonly<{ source: RecordedSource | null; ownNotes: boolean; badge?: RunMemberNode['badge']; decision: DecisionLocator | null }>
/** One row's control: its target and the choice applied, whether its copy runs, and its locks. */
type RowInput = Readonly<{
  key: string
  address: string
  /** An agent row's run ID (a Team row has none: a Team is never the focused agent). */
  agentRunId?: string
  /** The launch its run has. */
  started: Launch
  target: TargetKey
  stop: StopReference | null
  running: boolean
  origin: RowOrigin
  /** A peer's run (read-only): its node's name. */
  remoteNode?: string
  /** A delegated run's own name, as the server named its row (autobyteus-461 SR-091); a member is named by `nameOf`. */
  name?: string
}>

/**
 * Nodes from neutral facts (both DTO casings), shaped like the run's own Members: a Team shows its settings card, then its agents.
 * `nameOf` is the root's naming rule, so a row is named as the sidebar and the conversation name the copy.
 */
const builders = (deps: RunMemberTreeDeps, control: DelegatedRowControl, nameOf: (address: string) => string) => {
  const rowFacts = (input: RowInput) => {
    // Its launch and origin as its run has them now (the tree's `launch`, SR-084: a save records `settings`, V-11).
    const origin = input.origin
    const facts = factsOf(origin.source, origin.ownNotes, origin.badge, origin.decision)
    // Each row shows its own choice only: a Team row's is its Team's default, a member's its own.
    const current = draftLaunch({ started: input.started, choice: control.draftOf(input.target) })
    const stopping = input.stop ? control.isStopping(input.stop) : false
    const delegated: RunMemberDelegatedFacts = {
      target: input.target,
      original: selectionOf(input.started),
      stop: input.stop,
      running: input.running,
      stopping,
    }
    // A row with a user choice shows no origin (and so no router reason either).
    const { sourceKey, routing, ...rest } = facts
    return {
      values: valuesOf(current.launch),
      delegated,
      locked: !input.remoteNode && control.editable && !input.running && !stopping ? MODEL_EDITABLE : LOCKED,
      launch: { ...(current.chosen ? rest : { ...rest, sourceKey, ...(routing ? { routing } : {}) }), ...(input.remoteNode ? { remoteNode: input.remoteNode } : {}) },
    }
  }
  return {
    agent: (input: RowInput, isCoordinator = false): RunMemberNode => {
      const { values, ...rest } = rowFacts(input)
      return memberNode({ key: input.key, kind: 'agent', name: input.name ?? nameOf(input.address), agentRunId: input.agentRunId, isCoordinator, values, parentValues: values,
        fields: MEMBER_RUN_SETTING_FIELDS, ...rest }, deps)
    },
    team: (input: RowInput, children: readonly RunMemberNode[]): RunMemberNode => {
      const { values, ...rest } = rowFacts(input)
      return memberNode({ key: input.key, kind: 'team', name: input.name ?? nameOf(input.address), values, parentValues: values,
        fields: MEMBER_RUN_SETTING_FIELDS, children, ...rest }, deps)
    },
  }
}

// --- The run's tree's delegated rows (SR-084) ---

/** The configured layers a copy skipped (the Model Router's own failure is shown on the Model Routing page, not here). */
const configuredFallbacks = <T extends { layer: string }>(fallbacks: readonly T[]) =>
  fallbacks.filter((fallback): fallback is T & { layer: RunMemberLaunchFallback['layer'] } => fallback.layer !== 'model_router')
const sourceOf = (source: CollaborationLaunchConfigurationSourceDto | null | undefined): RecordedSource | null => source ? {
  origin: source.origin,
  fallbacks: configuredFallbacks(source.fallbacks).map(({ layer, runtimeKind, llmModelIdentifier, detail }) => ({ layer, runtimeKind, llmModelIdentifier, detail })),
  ...(source.origin === 'model_router' ? { routing: { taskKind: source.taskKind, reason: source.choiceReason } } : {}),
} : null
const launchOf = (launch: RunTreeLaunchDto | undefined): Launch => launch ? {
  runtimeKind: launch.runtimeKind, llmModelIdentifier: launch.llmModelIdentifier,
  llmConfig: launch.llmConfig, autoExecuteTools: launch.autoExecuteTools ?? false,
} : null

/** A row of a run the top run delegated (here or on a peer node): not one of its own parts, not its own row. */
const isDelegatedRow = (row: RunTreeRowDto, top: RunTreeRef): boolean => {
  const target = row.openTarget
  if (row.key === `${top.kind === 'agent_team' ? 'team' : 'agent'}:${top.runId}`) return false
  if (row.kind === 'org_agent' || row.kind === 'org_team' || target?.runKind === 'agent_org') return false
  return !(target && target.runKind === (top.kind === 'agent' ? 'agent' : top.kind) && target.runId === top.runId)
}

/**
 * Settings' delegated rows (autobyteus-461 SR-084): the run's tree's rows of the runs it delegated, at any depth, each a
 * row of its own, a team with its members as child rows. A peer's run is read-only, with its node's name. Nothing about
 * a run is derived here: its launch, origin, target and members are the server's.
 */
export const treeDelegatedLaunchNodes = (rows: readonly RunTreeRowDto[], top: RunTreeRef, deps: RunMemberTreeDeps,
  control: DelegatedRowControl = NO_CONTROL): RunMemberNode[] => {
  const build = builders(deps, control, (address) => rows.find((row) => row.address === address)?.name ?? address)
  const byKey = new Map(rows.map((row) => [row.key, row]))
  const delegatorOf = (row: RunTreeRowDto) => row.parentKey ? byKey.get(row.parentKey)?.openTarget?.agentRunId ?? null : null
  const live = (ids: readonly string[]) => ids.some((id) => control.isAgentLive(id))
  const result: RunMemberNode[] = []
  for (const row of rows) {
    if (!isDelegatedRow(row, top) || row.kind === 'team_member' || row.kind === 'peer_member') continue
    const target = row.openTarget
    const remoteNode = row.peer?.nodeName
    if (!isTeamRow(row)) {
      const agentRunId = target?.agentRunId ?? row.statusIds[0]!
      result.push(build.agent({ key: row.key, address: row.address ?? '', name: row.name, agentRunId, started: launchOf(row.launch), target: `agent:${agentRunId}`,
        stop: remoteNode ? null : { agentRunId }, running: live([agentRunId]), remoteNode,
        origin: { source: sourceOf(row.launch?.source), ownNotes: true, badge: 'delegated_run', decision: locatorOf(delegatorOf(row), row.address ?? '', row.address ?? '') } }))
      continue
    }
    const teamRunId = target?.runId ?? row.key.slice(row.key.indexOf(':') + 1)
    const memberRows = rows.filter((candidate) => candidate.parentKey === row.key)
    const running = live(memberRows.map((member) => member.statusIds[0]!))
    const members = memberRows.map((member) => {
      const agentRunId = member.openTarget?.agentRunId ?? member.statusIds[0]!
      return build.agent({ key: member.key, address: member.address ?? '', agentRunId, started: launchOf(member.launch), target: `agent:${agentRunId}`,
        stop: null, running, remoteNode, origin: { source: sourceOf(member.launch?.source), ownNotes: member.launch?.ownSource ?? false,
          decision: locatorOf(delegatorOf(row), row.address ?? '', member.address ?? '') } }, agentRunId === target?.agentRunId)
    })
    result.push(build.team({ key: row.key, address: row.address ?? '', name: row.name, started: launchOf(row.launch ?? memberRows.find((member) => member.openTarget?.agentRunId === target?.agentRunId)?.launch),
      target: `team:${teamRunId}`, stop: remoteNode ? null : { teamRunId }, running, remoteNode,
      origin: { source: sourceOf(row.launch?.source), ownNotes: true, badge: 'delegated_run', decision: null } }, members))
  }
  return result
}

// --- Where each row's Save goes (autobyteus-461 SR-064, rule 2) ---

/**
 * The run a delegated row's change is saved to, by that run's own stopped-run save: an agent row's own run; a Team row
 * the Team run at `/` (its default only: each member keeps its own launch, CR-461-089); a Team member row the Team run at
 * the member's address in the Team run's own space.
 */
export type DelegatedSaveTarget =
  | Readonly<{ kind: 'agent'; agentRunId: string }>
  | Readonly<{ kind: 'team'; teamRunId: string }>
  | Readonly<{ kind: 'team_member'; teamRunId: string; memberAddress: string }>

/** Each local delegated row's save target, from the tree (peer rows keep no editable launch). */
export const treeDelegatedSaveTargets = (rows: readonly RunTreeRowDto[], top: RunTreeRef): ReadonlyMap<TargetKey, DelegatedSaveTarget> => {
  const targets = new Map<TargetKey, DelegatedSaveTarget>()
  for (const row of rows) {
    const target = row.openTarget
    if (!target || row.peer || !isDelegatedRow(row, top)) continue
    if (row.kind === 'agent') targets.set(`agent:${target.agentRunId}`, Object.freeze({ kind: 'agent', agentRunId: target.agentRunId }))
    else if (row.kind === 'team') targets.set(`team:${target.runId}`, Object.freeze({ kind: 'team', teamRunId: target.runId }))
    else if (row.kind === 'team_member') {
      targets.set(`agent:${target.agentRunId}`, Object.freeze({ kind: 'team_member', teamRunId: target.runId, memberAddress: row.address ?? '' }))
    }
  }
  return targets
}

/** Rows (at any depth) by key, for edits and options. */
export const delegatedRowsByKey = (rows: readonly RunMemberNode[]): ReadonlyMap<string, RunMemberNode> => {
  const map = new Map<string, RunMemberNode>()
  const visit = (nodes: readonly RunMemberNode[]): void => nodes.forEach((node) => { map.set(node.key, node); visit(node.children) })
  visit(rows)
  return map
}
