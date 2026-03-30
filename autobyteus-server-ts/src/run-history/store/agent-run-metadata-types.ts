import type { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { AgentRunStatusRecord } from "./agent-run-history-index-record-types.js";

export type AgentRunMetadata = {
  runId: string;
  agentDefinitionId: string;
  workspaceRootPath: string;
  llmModelIdentifier: string;
  llmConfig: Record<string, unknown> | null;
  autoExecuteTools: boolean;
  skillAccessMode: SkillAccessMode | null;
  runtimeKind: RuntimeKind;
  platformAgentRunId: string | null;
  lastKnownStatus: AgentRunStatusRecord;
};
