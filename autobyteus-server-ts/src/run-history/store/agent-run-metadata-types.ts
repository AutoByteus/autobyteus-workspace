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
};

/** The run a task agent is part of (contract §3.1): it records the link, hosts, idles, wakes and stops it. */
export type TaskAgentCoordinatingRun = Readonly<{
  kind: "agent" | "agent_team" | "agent_org";
  runId: string;
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
