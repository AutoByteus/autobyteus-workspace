import {
  resolveApprovalPolicyForAutoExecuteTools,
  resolveDefaultModel,
} from "./codex-runtime-launch-config.js";
import {
  resolveAllowedRecipientNamesFromManifest,
  resolveDynamicTools,
  resolveMemberNameFromMetadata,
  resolveSendMessageToEnabledFromMetadata,
  resolveTeamManifestMembersFromMetadata,
  resolveTeamRunIdFromMetadata,
} from "./codex-send-message-tooling.js";
import {
  composeMemberRuntimeInstructions,
  renderMarkdownInstructionSection,
  renderMarkdownInstructionSections,
  resolveMemberRuntimeInstructionSourcesFromMetadata,
} from "../member-runtime/member-runtime-instruction-composer.js";
import {
  handleRuntimeNotification,
  isRuntimeMessageForSession,
} from "./codex-runtime-event-router.js";
import { resolveCodexSessionReasoningEffort } from "./codex-runtime-model-catalog.js";
import {
  resumeCodexThread,
  startCodexThread,
} from "./codex-runtime-thread-lifecycle.js";
import type {
  CodexInterAgentRelayHandler,
  CodexRunSessionState,
  CodexRuntimeEvent,
  SessionRuntimeOptions,
} from "./codex-runtime-shared.js";
import { createCodexSessionStartupState } from "./codex-runtime-shared.js";
import type { JsonObject } from "./codex-runtime-json.js";
import type { CodexAppServerProcessManager } from "./codex-app-server-process-manager.js";
import type { CodexWorkspaceSkillMaterializer } from "./codex-workspace-skill-materializer.js";

const isRuntimeRawEventDebugEnabled = process.env.RUNTIME_RAW_EVENT_DEBUG === "1";

export const startCodexRuntimeSession = async (input: {
  runId: string;
  options: SessionRuntimeOptions;
  resumeThreadId: string | null;
  processManager: CodexAppServerProcessManager;
  workspaceSkillMaterializer: CodexWorkspaceSkillMaterializer;
  interAgentRelayHandler: CodexInterAgentRelayHandler | null;
  resolveSessionCount: () => number;
  emitEvent: (state: CodexRunSessionState, event: CodexRuntimeEvent) => void;
  handleServerRequest: (
    state: CodexRunSessionState,
    requestId: string | number,
    method: string,
    params: JsonObject,
  ) => void;
  handleClientClose: (state: CodexRunSessionState, error: unknown) => void;
}): Promise<CodexRunSessionState> => {
  const model = input.options.modelIdentifier ?? resolveDefaultModel();
  const workingDirectory = input.options.workingDirectory || process.cwd();
  const reasoningEffort = resolveCodexSessionReasoningEffort(
    input.options.llmConfig,
    input.options.runtimeMetadata,
  );
  const teamRunId = resolveTeamRunIdFromMetadata(input.options.runtimeMetadata);
  const memberName = resolveMemberNameFromMetadata(input.options.runtimeMetadata);
  const sendMessageToEnabled = resolveSendMessageToEnabledFromMetadata(
    input.options.runtimeMetadata,
  );
  const teamManifestMembers = resolveTeamManifestMembersFromMetadata(
    input.options.runtimeMetadata,
  );
  const allowedRecipientNames = resolveAllowedRecipientNamesFromManifest({
    currentMemberName: memberName,
    members: teamManifestMembers,
  });
  const instructionSources = resolveMemberRuntimeInstructionSourcesFromMetadata(
    input.options.runtimeMetadata,
  );
  const instructionComposition = composeMemberRuntimeInstructions({
    teamInstructions: instructionSources.teamInstructions,
    agentInstructions: instructionSources.agentInstructions,
    currentMemberName: memberName,
    sendMessageToEnabled,
    teammates: teamManifestMembers,
  });
  const baseInstructions = renderMarkdownInstructionSections([
    {
      title: "Team Instruction",
      content: instructionComposition.teamInstruction,
    },
    {
      title: "Agent Instruction",
      content: instructionComposition.agentInstruction,
    },
  ]);
  const developerInstructions = renderMarkdownInstructionSection(
    "Runtime Instruction",
    instructionComposition.runtimeInstruction,
  );
  const dynamicTools = resolveDynamicTools({
    teamRunId,
    interAgentRelayEnabled: Boolean(input.interAgentRelayHandler),
    sendMessageToEnabled,
    allowedRecipientNames,
  });
  const approvalPolicy = resolveApprovalPolicyForAutoExecuteTools(
    input.options.autoExecuteTools,
  );
  const client = await input.processManager.acquireClient(workingDirectory);
  let materializedConfiguredSkills = [] as CodexRunSessionState["materializedConfiguredSkills"];
  try {
    materializedConfiguredSkills =
      await input.workspaceSkillMaterializer.materializeConfiguredCodexWorkspaceSkills({
        workingDirectory,
        configuredSkills: input.options.configuredSkills,
        skillAccessMode: input.options.skillAccessMode,
      });
    const threadId = input.resumeThreadId
      ? await resumeCodexThread(
          client,
          input.resumeThreadId,
          workingDirectory,
          model,
          approvalPolicy,
          dynamicTools,
          baseInstructions,
          developerInstructions,
        )
      : await startCodexThread(
          client,
          workingDirectory,
          model,
          approvalPolicy,
          dynamicTools,
          baseInstructions,
          developerInstructions,
        );
    if (!threadId) {
      throw new Error("Codex thread id was not returned by app server.");
    }

    const state: CodexRunSessionState = {
      runId: input.runId,
      client,
      threadId,
      model,
      workingDirectory,
      reasoningEffort,
      runtimeMetadata: {
        ...(input.options.runtimeMetadata ?? {}),
        model,
        cwd: workingDirectory,
        reasoning_effort: reasoningEffort,
      },
      currentStatus: "IDLE",
      activeTurnId: null,
      startup: createCodexSessionStartupState(),
      approvalRecords: new Map(),
      listeners: new Set(),
      unbindHandlers: [],
      teamRunId,
      memberName,
      sendMessageToEnabled,
      configuredSkills: input.options.configuredSkills ?? [],
      skillAccessMode: input.options.skillAccessMode ?? null,
      materializedConfiguredSkills,
    };

    state.unbindHandlers.push(
      client.onNotification((message) => {
        const matchesSession = isRuntimeMessageForSession(
          state,
          message.method,
          message.params,
          input.resolveSessionCount(),
        );
        if (isRuntimeRawEventDebugEnabled) {
          console.log("[CodexRuntimeNotification]", {
            runId: input.runId,
            method: message.method,
            matchesSession,
            threadId: state.threadId,
            activeTurnId: state.activeTurnId,
            sessionCount: input.resolveSessionCount(),
            paramKeys: Object.keys(message.params ?? {}),
          });
        }
        if (!matchesSession) {
          return;
        }
        handleRuntimeNotification(
          state,
          message.method,
          message.params,
          input.emitEvent,
        );
      }),
    );
    state.unbindHandlers.push(
      client.onServerRequest((message) => {
        const matchesSession = isRuntimeMessageForSession(
          state,
          message.method,
          message.params,
          input.resolveSessionCount(),
        );
        if (isRuntimeRawEventDebugEnabled) {
          console.log("[CodexRuntimeServerRequest]", {
            runId: input.runId,
            id: message.id,
            method: message.method,
            matchesSession,
            threadId: state.threadId,
            activeTurnId: state.activeTurnId,
            sessionCount: input.resolveSessionCount(),
            paramKeys: Object.keys(message.params ?? {}),
          });
        }
        if (!matchesSession) {
          return;
        }
        input.handleServerRequest(state, message.id, message.method, message.params);
      }),
    );
    state.unbindHandlers.push(
      client.onClose((error) => {
        input.handleClientClose(state, error);
      }),
    );
    return state;
  } catch (error) {
    await input.workspaceSkillMaterializer
      .cleanupMaterializedCodexWorkspaceSkills(materializedConfiguredSkills)
      .catch(() => {});
    await input.processManager.releaseClient(workingDirectory).catch(() => {});
    throw error;
  }
};
