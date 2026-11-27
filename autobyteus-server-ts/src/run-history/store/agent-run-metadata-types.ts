import type { ApplicationExecutionContext } from "../../application-orchestration/domain/models.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { LaunchConfigurationSource } from "../../agent-collaboration/domain/launch-configuration-source.js";
import type { ContainedIn } from "../../agent-collaboration/domain/contained-in.js";

export type AgentRunMetadata = {
  runId: string;
  agentDefinitionId: string;
  workspaceRootPath: string;
  memoryDir: string;
  llmModelIdentifier: string;
  llmConfig: Record<string, unknown> | null;
  autoExecuteTools: boolean;
  runtimeKind: RuntimeKind;
  platformAgentRunId: string | null;
  preparedAt?: string | null;
  preparedExpiresAt?: string | null;
  startedAt?: string | null;
  applicationExecutionContext?: ApplicationExecutionContext | null;
  /** Present only on a delegated run (contract §2.2): its origin, written once; absent means the user (or an application) started it. */
  delegatedFrom?: DelegatedFrom;
  /**
   * A direct Org agent (org-teams-follow-definition): its Org container and its address there, written once when it is
   * created; its `address` is the same Org address. Absent: a run outside any Org.
   */
  containedIn?: ContainedIn;
  /**
   * The run's own address (contract §2.3): written when it is first fixed (a delegated run: at the delegation; a run the
   * user started: when it first collaborates). Absent means "not fixed yet": the address is derived from the definition.
   */
  address?: AgentTeamAddress;
  /** How the run's launch settings were resolved, when recorded (a delegated run's resolved launch, contract §2.2). */
  launchSource?: LaunchConfigurationSource;
  /**
   * autobyteus-32: the server service that created and owns this run (a system-owned run); absent means an ordinary run.
   * A system-owned run is never a collaboration member.
   */
  systemRunOwner?: SystemRunOwner;
  /**
   * autobyteus-316: present from the settings save that changed the agent runtime until the run's next input makes the
   * switch real. The metadata's own binding fields hold the NEW binding; `from` holds the previous one. Absent means none.
   */
  pendingRuntimeSwitch?: PendingRuntimeSwitch;
};

/** What a run's agent runtime binds it to: the agent runtime, model, model settings and the provider's own session. */
export type RunProviderBinding = Pick<AgentRunMetadata, "runtimeKind" | "llmModelIdentifier" | "llmConfig" | "platformAgentRunId">;

/**
 * `switchId` is the identity of this switch (made at the first pending save, kept by later saves, new after an undo; part of
 * the switch key); `from` is the binding before it.
 */
export type PendingRuntimeSwitch = Readonly<{
  switchId: string;
  from: RunProviderBinding;
  /** Why an automatic switch happened (autobyteus-646 R-7); absent for a person's switch. The marker text is rendered from it. */
  cause?: RuntimeSwitchCause;
}>;

/**
 * The facts of an automatic runtime switch (autobyteus-646 R-7), stored with its pending switch and rendered into the
 * hand-over marker at activation; no sentence is stored. `usage_limit` is the only kind now; a later kind adds its fields.
 */
export type RuntimeSwitchCause = Readonly<{
  kind: "usage_limit";
  /** The failed runtime's reset time, or `null` when it did not say. */
  resetAt: string | null;
  chosenBy: "model_router" | "agent_history";
  /** The Model Router's sentence; `null` when chosen from history. */
  reason: string | null;
}>;

/** The services that own system runs: the Model Router agent's. */
export type SystemRunOwner = "model_router";

/** The run a delegated run was delegated from, one hop (contract §2.2). */
export type DelegatingRunRef = Readonly<{
  kind: "agent" | "agent_team" | "agent_org";
  runId: string;
}>;

/**
 * A delegated run's origin, in its own file (contract §2.2, §2.4, TC-10 revised): the run it was delegated from (one
 * hop) and the agent that delegated it. Written once when the run is created; never changes; equal by rule to its Task
 * entries' `delegatedFrom`. `nodeId` is present only on a run a peer node started: its delegating run is on that node.
 * Routing, placement and lifecycle never read it (they read the Task entries through `DelegationIndex`); readers ask
 * `isDelegated` or `isPeerStarted`.
 */
export type DelegatedFrom = Readonly<{
  delegatingRun: DelegatingRunRef;
  /** Absent on 4 old runs that never recorded it (contract E6). */
  delegatorAgentRunId?: string;
  nodeId?: string;
}>;

/** The origin of a run a peer node started: its node and its delegator are always recorded. */
export type PeerDelegatedFrom = DelegatedFrom & Readonly<{ nodeId: string; delegatorAgentRunId: string }>;

/** A delegated run, local or peer-started (contract §2.4): its own file carries `delegatedFrom`. */
export const isDelegated = (run: Readonly<{ delegatedFrom?: DelegatedFrom | null }>): boolean => Boolean(run.delegatedFrom);
/** A run a peer node started (contract §2.4): its `delegatedFrom` names the peer node. */
export const isPeerStarted = (run: Readonly<{ delegatedFrom?: DelegatedFrom | null }>): boolean => Boolean(run.delegatedFrom?.nodeId);
/** The peer origin of a run a peer started; `null` for a local delegated run or a run nobody delegated. */
export const peerDelegatedFromOf = (run: Readonly<{ delegatedFrom?: DelegatedFrom | null }>): PeerDelegatedFrom | null =>
  run.delegatedFrom && isPeerStarted(run) ? run.delegatedFrom as PeerDelegatedFrom : null;
