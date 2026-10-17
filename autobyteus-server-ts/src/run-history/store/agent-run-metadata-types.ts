import type { ApplicationExecutionContext } from "../../application-orchestration/domain/models.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { LaunchConfigurationSource } from "../../agent-collaboration/domain/launch-configuration-source.js";
import type { UserLaunchSelection } from "../domain/run-execution-tree-shared-records.js";

/**
 * Why a standalone run was launched. Absent means a user run; `server_helper` marks
 * server-internal helper runs (compaction, skill improver), which never become Agent roots.
 */
export type AgentRunLaunchPurpose = "user" | "server_helper";

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
  /** Stored only for helper runs; absent for user runs. */
  launchPurpose?: "server_helper";
};

/** The run a task agent is part of (contract §3.1): it records the link, hosts, idles, wakes and stops it. */
export type TaskAgentCoordinatingRun = Readonly<{
  kind: "agent" | "agent_team" | "agent_org";
  runId: string;
}>;

/**
 * `catalog`: started from a listed definition; the own file holds its definition and started launch.
 * `configured_place`: started from a configured place of the coordinating run; its definition and launch
 * stay the place's and follow later changes of that place (the record composes without `source`, U-4).
 */
export type TaskAgentOrigin = "catalog" | "configured_place";

/** The `taskAgent` section of a task agent's own run file; its presence is what makes the file a task agent's (G1, G2). */
export type TaskAgentSection = Readonly<{
  coordinatingRun: TaskAgentCoordinatingRun;
  /** The agent that delegated it; absent on records written before it existed. */
  delegatorAgentRunId?: string;
  address: AgentTeamAddress;
  origin: TaskAgentOrigin;
  /** How the launch settings were resolved, when recorded (a team's: its default launch source). */
  launchSource?: LaunchConfigurationSource;
  /** The user's Settings model edit, beside the started launch and never over it (DEC-005, U-1). */
  userLaunchSelection?: UserLaunchSelection;
}>;

/**
 * A task agent's own `run_metadata.json` (contract §3.1). The launch fields hold the launch it started
 * with; they are all `null` only when never recorded (a migrated `configured_place` record, U-4), and
 * `workspaceRootPath` may be `null` on its own (U-2). No prepared-run, launch-purpose or application fields.
 */
export type TaskAgentRunMetadata = Readonly<{
  runId: string;
  agentDefinitionId: string;
  workspaceRootPath: string | null;
  memoryDir: string;
  llmModelIdentifier: string | null;
  llmConfig: Readonly<Record<string, unknown>> | null;
  autoExecuteTools: boolean | null;
  runtimeKind: RuntimeKind | null;
  platformAgentRunId: string | null;
  startedAt: string;
  taskAgent: TaskAgentSection;
}>;
