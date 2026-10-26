import type { ApplicationExecutionContext } from "../../application-orchestration/domain/models.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { LaunchConfigurationSource } from "../../agent-collaboration/domain/launch-configuration-source.js";
import type { UserLaunchSelection } from "../domain/run-execution-tree-shared-records.js";

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
  /** Present only on a run a peer node delegated to this node (CM-10): its back-link; absent means none. */
  delegatedFrom?: DelegatedFrom;
  /** autobyteus-32: the run's file and shell tools are confined to its workspace where the runtime allows it; absent means none. */
  toolConfinement?: AgentRunToolConfinement;
  /**
   * autobyteus-32: the server service that created and owns this run (a system-owned run); absent means an ordinary run.
   * A system-owned run is never a collaboration member.
   */
  systemRunOwner?: SystemRunOwner;
};

/** Where a confined run's file and shell tools may act: its own workspace. */
export type AgentRunToolConfinement = "workspace";
/** The services that own system runs: the Model Router agent's. */
export type SystemRunOwner = "model_router";

/** The run a task agent is part of (contract §3.1): it records the link, hosts, idles, wakes and stops it. */
export type TaskAgentCoordinatingRun = Readonly<{
  kind: "agent" | "agent_team" | "agent_org";
  runId: string;
}>;

/**
 * The back-link of a standalone run that a peer node delegated to this node (DEC-112): which peer (`nodeId`,
 * its server ID), the run there that coordinates the delegation (`coordinatingRun`, echoed on every message
 * to that peer) and the agent that delegated it, the only run that may message this one. Written once at
 * creation; the run is a normal standalone run of this node with its own root.
 */
export type DelegatedFrom = Readonly<{
  nodeId: string;
  coordinatingRun: TaskAgentCoordinatingRun;
  delegatorAgentRunId: string;
}>;

/** The `taskAgent` section of a task agent's own run file; its presence is what makes the file a task agent's (G1, G2). */
export type TaskAgentSection = Readonly<{
  coordinatingRun: TaskAgentCoordinatingRun;
  /** The agent that delegated it; absent on records written before it existed. */
  delegatorAgentRunId?: string;
  address: AgentTeamAddress;
  /** How the launch settings were resolved, when recorded (a team's: its default launch source). */
  launchSource?: LaunchConfigurationSource;
  /** The user's Settings model edit, beside the started launch and never over it (DEC-005, U-1). */
  userLaunchSelection?: UserLaunchSelection;
}>;

/**
 * A task agent's own `run_metadata.json` (contract §3.1): its definition and the launch it started with,
 * which is what it restores with (plus its Settings edit). `workspaceRootPath` may be `null` (U-2). No
 * prepared-run, launch-purpose or application fields.
 */
export type TaskAgentRunMetadata = Readonly<{
  runId: string;
  agentDefinitionId: string;
  workspaceRootPath: string | null;
  memoryDir: string;
  llmModelIdentifier: string;
  llmConfig: Readonly<Record<string, unknown>> | null;
  autoExecuteTools: boolean;
  runtimeKind: RuntimeKind;
  platformAgentRunId: string | null;
  startedAt: string;
  taskAgent: TaskAgentSection;
}>;
