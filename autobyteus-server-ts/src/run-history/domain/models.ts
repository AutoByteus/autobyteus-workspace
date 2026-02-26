import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind.js";

export const RUN_HISTORY_INDEX_VERSION = 1;

export type RunKnownStatus = "ACTIVE" | "IDLE" | "ERROR";

export type RunEditableFieldFlags = {
  llmModelIdentifier: boolean;
  llmConfig: boolean;
  autoExecuteTools: boolean;
  skillAccessMode: boolean;
  workspaceRootPath: boolean;
  runtimeKind: boolean;
};

export interface RunHistoryIndexRow {
  runId: string;
  agentDefinitionId: string;
  agentName: string;
  workspaceRootPath: string;
  summary: string;
  lastActivityAt: string;
  lastKnownStatus: RunKnownStatus;
}

export interface RunHistoryIndexFile {
  version: number;
  rows: RunHistoryIndexRow[];
}

export interface RunManifest {
  agentDefinitionId: string;
  workspaceRootPath: string;
  llmModelIdentifier: string;
  llmConfig: Record<string, unknown> | null;
  autoExecuteTools: boolean;
  skillAccessMode: SkillAccessMode | null;
  runtimeKind: RuntimeKind;
  runtimeReference: RunRuntimeReference;
}

export interface RunRuntimeOverrides {
  llmModelIdentifier?: string | null;
  llmConfig?: Record<string, unknown> | null;
  autoExecuteTools?: boolean | null;
  skillAccessMode?: SkillAccessMode | null;
  workspaceRootPath?: string | null;
  runtimeKind?: RuntimeKind | null;
  runtimeReference?: RunRuntimeReference | null;
}

export interface RunRuntimeReference {
  runtimeKind: RuntimeKind;
  sessionId: string | null;
  threadId: string | null;
  metadata: Record<string, unknown> | null;
}

export interface RunHistoryItem {
  runId: string;
  summary: string;
  lastActivityAt: string;
  lastKnownStatus: RunKnownStatus;
  isActive: boolean;
}

export interface RunHistoryAgentGroup {
  agentDefinitionId: string;
  agentName: string;
  runs: RunHistoryItem[];
}

export interface RunHistoryWorkspaceGroup {
  workspaceRootPath: string;
  workspaceName: string;
  agents: RunHistoryAgentGroup[];
}

export interface RunResumeConfig {
  runId: string;
  isActive: boolean;
  manifestConfig: RunManifest;
  editableFields: RunEditableFieldFlags;
}
