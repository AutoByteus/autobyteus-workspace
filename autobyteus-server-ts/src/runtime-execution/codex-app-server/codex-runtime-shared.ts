import type { CodexAppServerClient } from "./codex-app-server-client.js";
import type { JsonObject } from "./codex-runtime-json.js";
import type { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { ResolvedRuntimeSkill } from "../configured-runtime-skills.js";
import type { MaterializedCodexWorkspaceSkill } from "./codex-workspace-skill-materializer.js";

export type CodexRuntimeEvent = {
  method: string;
  params: JsonObject;
  request_id?: string | number;
};

export type CodexApprovalRecord = {
  requestId: string | number;
  method: string;
  invocationId: string;
  itemId: string;
  approvalId: string | null;
};

export type CodexSessionStartupStatus = "pending" | "ready" | "failed";

export type CodexSessionStartupState = {
  status: CodexSessionStartupStatus;
  waitForReady: Promise<void>;
  resolveReady: () => void;
  rejectReady: (error: Error) => void;
};

export type CodexRunSessionState = {
  runId: string;
  client: CodexAppServerClient;
  threadId: string;
  model: string | null;
  workingDirectory: string;
  reasoningEffort: string | null;
  runtimeMetadata: Record<string, unknown>;
  currentStatus: string | null;
  activeTurnId: string | null;
  startup: CodexSessionStartupState;
  approvalRecords: Map<string, CodexApprovalRecord>;
  listeners: Set<(event: CodexRuntimeEvent) => void>;
  unbindHandlers: Array<() => void>;
  teamRunId: string | null;
  memberName: string | null;
  sendMessageToEnabled: boolean;
  configuredSkills: ResolvedRuntimeSkill[];
  skillAccessMode: SkillAccessMode | null;
  materializedConfiguredSkills: MaterializedCodexWorkspaceSkill[];
};

export const createCodexSessionStartupState = (): CodexSessionStartupState => {
  const control = {
    resolve: () => {},
    reject: (_error: Error) => {},
  };
  const state = {
    status: "pending" as CodexSessionStartupStatus,
    waitForReady: Promise.resolve(),
    resolveReady: () => control.resolve(),
    rejectReady: (error: Error) => control.reject(error),
  };
  state.waitForReady = new Promise<void>((resolve, reject) => {
    control.resolve = () => {
      if (state.status !== "pending") {
        return;
      }
      state.status = "ready";
      resolve();
    };
    control.reject = (error: Error) => {
      if (state.status !== "pending") {
        return;
      }
      state.status = "failed";
      reject(error);
    };
  });
  void state.waitForReady.catch(() => {});
  return state;
};

export interface CodexInterAgentEnvelope {
  senderAgentRunId: string;
  senderAgentName?: string | null;
  recipientName: string;
  messageType: string;
  content: string;
  teamRunId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface CodexInterAgentRelayRequest {
  senderRunId: string;
  senderTeamRunId: string | null;
  senderMemberName: string | null;
  senderTurnId?: string | null;
  toolArguments: Record<string, unknown>;
}

export interface CodexInterAgentRelayResult {
  accepted: boolean;
  code?: string;
  message?: string;
}

export type CodexInterAgentRelayHandler = (
  request: CodexInterAgentRelayRequest,
) => Promise<CodexInterAgentRelayResult>;

export type SessionRuntimeOptions = {
  modelIdentifier: string | null;
  workingDirectory: string;
  autoExecuteTools: boolean;
  llmConfig?: Record<string, unknown> | null;
  runtimeMetadata?: Record<string, unknown> | null;
  configuredSkills?: ResolvedRuntimeSkill[] | null;
  skillAccessMode?: SkillAccessMode | null;
};
