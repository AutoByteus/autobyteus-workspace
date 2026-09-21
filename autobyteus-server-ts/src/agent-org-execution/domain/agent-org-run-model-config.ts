import type { AgentOrgRunExecutionTreeFileV1 } from "./agent-org-run-execution-tree.js";
import type { RunModelConfigEditability, RunModelConfigUpdateResult } from "../../run-history/domain/run-model-config.js";
import type { RunModelOptions } from "../../llm-management/domain/run-model-selection.js";

export type AgentOrgRunModelConfigScopeKind =
  | "CONFIGURED_ORG"
  | "CONFIGURED_TEAM"
  | "CONFIGURED_AGENT";

export type AgentOrgRunModelConfigPatch = Readonly<{
  scopeKind: AgentOrgRunModelConfigScopeKind;
  scopeAddress: string;
  llmModelIdentifier: string;
  llmConfig: Readonly<Record<string, unknown>> | null;
}>;

export type AgentOrgRunModelConfig = Readonly<{
  orgRunId: string;
  executionTree: AgentOrgRunExecutionTreeFileV1;
  isActive: boolean;
  editability: RunModelConfigEditability;
}>;

export type AgentOrgRunModelOption = RunModelOptions & Readonly<{
  scopeKind: AgentOrgRunModelConfigScopeKind;
  scopeAddress: string;
}>;

export type AgentOrgRunModelConfigResult = RunModelConfigUpdateResult<AgentOrgRunExecutionTreeFileV1 | null>;
