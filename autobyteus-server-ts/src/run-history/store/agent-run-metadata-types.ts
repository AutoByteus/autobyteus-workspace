import type { ApplicationExecutionContext } from "../../application-orchestration/domain/models.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";

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
