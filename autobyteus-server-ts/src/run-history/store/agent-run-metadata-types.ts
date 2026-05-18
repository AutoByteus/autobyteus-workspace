import type { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { ApplicationExecutionContext } from "../../application-orchestration/domain/models.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { AgentRunStatusRecord } from "./agent-run-history-index-record-types.js";

export type AgentRunActivationState =
  | "PREPARED"
  | "ACTIVATING"
  | "ACTIVATED"
  | "ACTIVATION_FAILED";

export type AgentRunMetadata = {
  runId: string;
  agentDefinitionId: string;
  workspaceRootPath: string;
  memoryDir: string;
  llmModelIdentifier: string;
  llmConfig: Record<string, unknown> | null;
  autoExecuteTools: boolean;
  skillAccessMode: SkillAccessMode | null;
  runtimeKind: RuntimeKind;
  platformAgentRunId: string | null;
  lastKnownStatus: AgentRunStatusRecord;
  activationState?: AgentRunActivationState;
  preparedAt?: string | null;
  preparedExpiresAt?: string | null;
  archivedAt?: string | null;
  applicationExecutionContext?: ApplicationExecutionContext | null;
};
