import type { NodeRuntimesReading } from "../../available-agent-runtimes/available-agent-runtimes-report.js";

/**
 * The Task a fresh delegated copy serves (design § SR-014 D1): a Project Task (key, Project, title), or a Task with no
 * Project (no key; its title is the first line of its description). `taskId` is null only while a description-only
 * delegation's own Task does not exist yet: the Task side creates it when the copy is linked, after placement.
 */
export type DelegationTaskIdentity = Readonly<{
  taskId: string | null;
  taskKey: string | null;
  projectId: string | null;
  title: string;
}>;

/** The work a fresh delegated copy is started for, known before its placement is resolved (DS-001). */
export type DelegationWork = Readonly<{
  /** The Task's description (a saved Task's comments follow it), as the copy receives it. */
  text: string;
  task: DelegationTaskIdentity;
}>;

/** A layer skipped before routing, as the routing request names it. */
export type RoutingSkippedLayer = Readonly<{
  layer: "agent_default" | "team_default";
  runtimeKind: string | null;
  llmModelIdentifier: string | null;
  detail: string;
}>;

/** One agent the Model Router is asked to choose for (supplement § 5 "What it is told"). */
export type RoutingAgentToChoose = Readonly<{
  /** The agent's address in the copy (the decision tool's key for its choice). */
  address: string;
  name: string;
  description: string;
  role: string | null;
  skipped: readonly RoutingSkippedLayer[];
  /** A usable runtime-only default's runtime: the choice must stay on it (supplement § 3.2); null otherwise. */
  requiredRuntime: string | null;
}>;

/** A member of the copy that its own or its Team's default already covers. */
export type RoutingCoveredAgent = Readonly<{
  address: string;
  runtimeKind: string;
  llmModelIdentifier: string;
  source: "agent_default" | "team_default";
}>;

/** One routing request: one delegation's agents that steps 1–2 did not cover. */
export type RoutingRequest = Readonly<{
  work: DelegationWork;
  target: Readonly<{ kind: "agent" | "agent_team"; name: string; description: string }>;
  agents: readonly RoutingAgentToChoose[];
  covered: readonly RoutingCoveredAgent[];
  /** The delegating run's launch on this node; null for a copy started for a peer node. */
  delegatingLaunch: Readonly<{ runtimeKind: string; llmModelIdentifier: string }> | null;
}>;

/** The router's answer for one agent (supplement § 5 "How it answers"). */
export type LaunchChoice = Readonly<{
  address: string;
  runtimeKind: string;
  llmModelIdentifier: string;
  /** The router's short free-text label, trimmed, 1–40 characters (REQ-011). */
  taskKind: string;
  /** One sentence. */
  reason: string;
}>;

/**
 * The outcome of asking the node's Model Router: a valid choice for every asked agent; the router is not active (and
 * why); or it could not choose (and why). Each is an explicit result (Principle 13), never a missing value.
 */
export type ModelRoutingOutcome =
  | Readonly<{ kind: "chosen"; choices: readonly LaunchChoice[] }>
  | Readonly<{ kind: "not_active"; reason: string }>
  | Readonly<{ kind: "failed"; reason: string }>;

/**
 * Routing for one delegation while Model Routing is on. It holds the node's runtime facts read for this delegation
 * (the launch usability rule's U3 and U4b; null when they could not be read) and its routing budget, which started
 * when the delegation was opened (QR-001).
 */
export type DelegationRouting = Readonly<{
  facts: NodeRuntimesReading | null;
  /**
   * Why the node's Model Router cannot choose now (supplement § 4, as the delegation note words it); null when it is
   * active. A runtime-only default is routed on its runtime only while the router is active (§ 3.2).
   */
  notActiveReason: string | null;
  /** `not_active` with `notActiveReason` when the router is not active. */
  route(request: RoutingRequest): Promise<ModelRoutingOutcome>;
}>;

/** The port `agent-collaboration` resolves launches through (design § Dependency Rules). */
export interface ModelRouterPort {
  /**
   * Model Routing on: reads the node's runtime facts once and starts this delegation's 40 s routing budget. Off: null,
   * with nothing read (REQ-002, DEC-022).
   */
  openDelegation(): Promise<DelegationRouting | null>;
}

/** A server that does not compose Model Routing (an application execution scope, a unit test): always off. */
export const NO_MODEL_ROUTING: ModelRouterPort = Object.freeze({ openDelegation: async () => null });

/** Where a recorded agent's launch came from, as Decisions and Overview group it. */
export type DecisionLaunchSource = "agent_default" | "team_default" | "model_router" | "inherited";

/**
 * One decision record: one agent of a fresh delegated copy resolved on this node while Model Routing was on (REQ-012).
 * `delegatingRunId` and `delegatingAgentName` are null and `fromNode` set for a copy started for a peer node (this node
 * knows only the node that delegated, not its agents).
 */
export type RoutingDecisionRecord = Readonly<{
  recordedAt: string;
  /** Null only for a copy started for a peer whose Task did not exist yet when it delegated. */
  taskId: string | null;
  taskKey: string | null;
  projectId: string | null;
  taskTitle: string;
  delegatingRunId: string | null;
  /** The delegating agent's name (its address basename) on this node; null for a copy started for a peer. */
  delegatingAgentName: string | null;
  fromNode: string | null;
  copyAddress: string;
  copyKind: "agent" | "agent_team";
  agentAddress: string;
  runtimeKind: string;
  llmModelIdentifier: string;
  source: DecisionLaunchSource;
  taskKind: string | null;
  choiceReason: string | null;
  /** Why the Model Router could not choose for this agent (it then runs on the delegating run's launch); null otherwise. */
  routerFailure: string | null;
  /** The configured defaults skipped before this launch, with why (Decisions shows them). */
  skipped: readonly RoutingSkippedLayer[];
}>;

/** The port dispatch success points record through (design § Dependency Rules). */
export interface RoutingDecisionRecorder {
  record(records: readonly RoutingDecisionRecord[]): Promise<void>;
}

/** One agent of a decision record, as launch resolution knows it. */
export type RoutingDecisionAgent = Pick<
  RoutingDecisionRecord,
  "agentAddress" | "runtimeKind" | "llmModelIdentifier" | "source" | "taskKind" | "choiceReason" | "routerFailure" | "skipped"
>;

/**
 * A fresh copy's decision records before it starts: what launch resolution decided, per agent. Present only on a copy
 * resolved while Model Routing was on (REQ-002, SR-012 point 2); recorded once the copy started.
 */
export type RoutingDecisionDraft = Readonly<{
  copyAddress: string;
  copyKind: "agent" | "agent_team";
  agents: readonly RoutingDecisionAgent[];
}>;

/** The draft's records for the copy that started: its Task and who delegated it. */
export const decisionRecordsOf = (draft: RoutingDecisionDraft, started: Readonly<{
  recordedAt: string;
  task: DelegationTaskIdentity;
  delegatingRunId: string | null;
  delegatingAgentName: string | null;
  fromNode: string | null;
}>): RoutingDecisionRecord[] => draft.agents.map((agent) => Object.freeze({
  recordedAt: started.recordedAt,
  taskId: started.task.taskId,
  taskKey: started.task.taskKey,
  projectId: started.task.projectId,
  taskTitle: started.task.title,
  delegatingRunId: started.delegatingRunId,
  delegatingAgentName: started.delegatingAgentName,
  fromNode: started.fromNode,
  copyAddress: draft.copyAddress,
  copyKind: draft.copyKind,
  ...agent,
}));
