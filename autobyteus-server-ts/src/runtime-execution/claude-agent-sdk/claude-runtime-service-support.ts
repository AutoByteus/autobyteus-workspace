import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import type { WorkspaceManager } from "../../workspaces/workspace-manager.js";
import {
  asString,
  buildClaudeSdkSpawnEnvironment,
  CLAUDE_AGENT_SDK_MODULE_NAME,
  resolveClaudeSdkPermissionMode,
  type ClaudeRunSessionState,
  type ClaudeSdkModuleLike,
  type ClaudeSessionRuntimeOptions,
} from "./claude-runtime-shared.js";
import {
  normalizeModelDescriptors,
  readDefaultModelIdentifiers,
  toModelInfo,
} from "./claude-runtime-model-catalog.js";
import { normalizeSessionMessages } from "./claude-runtime-message-normalizers.js";
import {
  resolveSdkFunction,
  tryCallWithVariants,
  tryGetSupportedModelsFromQueryControl,
} from "./claude-runtime-sdk-interop.js";
import { createClaudeRunSessionState } from "./claude-runtime-session-state.js";
import { ClaudeRuntimeTranscriptStore } from "./claude-runtime-transcript-store.js";
import { rebindDeferredRuntimeListeners } from "../runtime-event-listener-hub.js";

export type ClaudeRuntimeReferenceRecord = {
  sessionId: string;
  metadata: Record<string, unknown>;
};

export const resolveClaudeIncrementalDelta = (options: {
  normalizedDelta: string;
  source: "stream_delta" | "assistant_message" | "result" | "unknown";
  assistantOutput: string;
  hasObservedStreamingDelta: boolean;
}): string | null => {
  const {
    normalizedDelta,
    source,
    assistantOutput,
    hasObservedStreamingDelta,
  } = options;

  if (source === "stream_delta") {
    return normalizedDelta;
  }

  if (source === "result" && assistantOutput.length > 0 && !hasObservedStreamingDelta) {
    return null;
  }

  if (!hasObservedStreamingDelta || (source !== "assistant_message" && source !== "result")) {
    return normalizedDelta;
  }

  if (normalizedDelta.startsWith(assistantOutput)) {
    const suffix = normalizedDelta.slice(assistantOutput.length);
    return suffix.length > 0 ? suffix : null;
  }

  if (assistantOutput.startsWith(normalizedDelta)) {
    return null;
  }

  return null;
};

export const isClaudeTurnTerminalChunk = (chunk: unknown): boolean => {
  const payload =
    chunk && typeof chunk === "object" && !Array.isArray(chunk)
      ? (chunk as Record<string, unknown>)
      : null;
  return asString(payload?.type)?.toLowerCase() === "result";
};

export const isClaudeSendMessageToToolingEnabled = (
  state: ClaudeRunSessionState,
  hasRelayHandler: boolean,
): boolean =>
  state.sendMessageToEnabled &&
  hasRelayHandler &&
  Boolean(state.teamRunId) &&
  state.allowedRecipientNames.length > 0;

export const adoptResolvedClaudeSessionId = (
  state: ClaudeRunSessionState,
  sessionId: string | null | undefined,
  transcriptStore: ClaudeRuntimeTranscriptStore,
): void => {
  const normalized = asString(sessionId);
  if (!normalized || normalized === state.sessionId) {
    return;
  }
  const previousSessionId = state.sessionId;
  state.sessionId = normalized;
  transcriptStore.migrateSessionMessages(previousSessionId, normalized);
};

export const createClaudeRuntimeSessionRecord = async (input: {
  runId: string;
  options: ClaudeSessionRuntimeOptions;
  closeRunSession: (runId: string) => Promise<void>;
  sessions: Map<string, ClaudeRunSessionState>;
  transcriptStore: ClaudeRuntimeTranscriptStore;
  deferredListenersByRunId: Map<string, Set<(event: unknown) => void>>;
}): Promise<ClaudeRuntimeReferenceRecord> => {
  await input.closeRunSession(input.runId);
  const runtimeMetadata = { ...(input.options.runtimeMetadata ?? {}) };
  const permissionMode = resolveClaudeSdkPermissionMode({
    runtimeMetadata,
    llmConfig: input.options.llmConfig,
  });
  const state = createClaudeRunSessionState({
    runId: input.runId,
    sessionId: input.runId,
    modelIdentifier: input.options.modelIdentifier,
    workingDirectory: input.options.workingDirectory,
    autoExecuteTools: Boolean(input.options.autoExecuteTools),
    permissionMode,
    runtimeMetadata,
    hasCompletedTurn: false,
  });
  input.sessions.set(input.runId, state);
  rebindDeferredRuntimeListeners({
    runId: input.runId,
    activeListeners: state.listeners,
    deferredListenersByRunId: input.deferredListenersByRunId as Map<string, Set<(event: never) => void>>,
  });
  input.transcriptStore.ensureSession(state.sessionId);
  return {
    sessionId: state.sessionId,
    metadata: {
      ...state.runtimeMetadata,
    },
  };
};

export const restoreClaudeRuntimeSessionRecord = async (input: {
  runId: string;
  options: ClaudeSessionRuntimeOptions;
  runtimeReference: {
    sessionId?: string | null;
    metadata?: Record<string, unknown> | null;
  } | null;
  closeRunSession: (runId: string) => Promise<void>;
  sessions: Map<string, ClaudeRunSessionState>;
  transcriptStore: ClaudeRuntimeTranscriptStore;
  deferredListenersByRunId: Map<string, Set<(event: unknown) => void>>;
}): Promise<ClaudeRuntimeReferenceRecord> => {
  await input.closeRunSession(input.runId);
  const resolvedSessionId = asString(input.runtimeReference?.sessionId);
  const sessionId = resolvedSessionId ?? input.runId;
  const metadataAutoExecuteTools = input.runtimeReference?.metadata?.autoExecuteTools;
  const resolvedAutoExecuteTools =
    typeof input.options.autoExecuteTools === "boolean"
      ? input.options.autoExecuteTools
      : typeof metadataAutoExecuteTools === "boolean"
        ? metadataAutoExecuteTools
        : false;
  const hasCompletedTurn = resolvedSessionId !== null && resolvedSessionId !== input.runId;
  const runtimeMetadata = {
    ...(input.runtimeReference?.metadata ?? {}),
    ...(input.options.runtimeMetadata ?? {}),
  };
  const permissionMode = resolveClaudeSdkPermissionMode({
    runtimeMetadata,
    llmConfig: input.options.llmConfig,
  });
  const state = createClaudeRunSessionState({
    runId: input.runId,
    sessionId,
    modelIdentifier: input.options.modelIdentifier,
    workingDirectory: input.options.workingDirectory,
    autoExecuteTools: resolvedAutoExecuteTools,
    permissionMode,
    runtimeMetadata,
    hasCompletedTurn,
  });
  input.sessions.set(input.runId, state);
  rebindDeferredRuntimeListeners({
    runId: input.runId,
    activeListeners: state.listeners,
    deferredListenersByRunId: input.deferredListenersByRunId as Map<string, Set<(event: never) => void>>,
  });
  input.transcriptStore.ensureSession(sessionId);
  return {
    sessionId,
    metadata: {
      ...state.runtimeMetadata,
    },
  };
};

export const getClaudeRunRuntimeReference = (
  sessions: Map<string, ClaudeRunSessionState>,
  runId: string,
): ClaudeRuntimeReferenceRecord | null => {
  const state = sessions.get(runId);
  if (!state) {
    return null;
  }
  return {
    sessionId: state.sessionId,
    metadata: {
      ...state.runtimeMetadata,
      model: state.model,
      cwd: state.workingDirectory,
    },
  };
};

export const listClaudeModels = async (sdk: ClaudeSdkModuleLike | null): Promise<ModelInfo[]> => {
  const supportedRows = await tryGetSupportedModelsFromQueryControl(
    sdk,
    buildClaudeSdkSpawnEnvironment(),
  );
  if (supportedRows.length > 0) {
    return supportedRows.map((row) => toModelInfo(row.identifier, row.displayName));
  }

  const listModelsFn = resolveSdkFunction(sdk, "listModels");
  if (listModelsFn) {
    const rows = await tryCallWithVariants(listModelsFn, [[], [{} as unknown]]);
    const normalized = normalizeModelDescriptors(rows);
    if (normalized.length > 0) {
      return normalized.map((row) => toModelInfo(row.identifier, row.displayName));
    }
  }

  return readDefaultModelIdentifiers().map((identifier) => toModelInfo(identifier));
};

export const getClaudeSessionMessages = async (input: {
  sessionId: string;
  sessions: Map<string, ClaudeRunSessionState>;
  transcriptStore: ClaudeRuntimeTranscriptStore;
  sdk: ClaudeSdkModuleLike | null;
}): Promise<Array<Record<string, unknown>>> => {
  const normalizedSessionId = asString(input.sessionId);
  if (!normalizedSessionId) {
    return [];
  }
  const canonicalSessionId = input.sessions.get(normalizedSessionId)?.sessionId ?? normalizedSessionId;
  const cachedMessages = input.transcriptStore.getCachedMessages(canonicalSessionId);

  const getSessionMessagesFn = resolveSdkFunction(input.sdk, "getSessionMessages");
  if (getSessionMessagesFn) {
    const variants: unknown[][] = [
      [canonicalSessionId],
      [{ sessionId: canonicalSessionId }],
    ];
    for (const args of variants) {
      try {
        const raw = await getSessionMessagesFn(...args);
        const normalized = normalizeSessionMessages(raw);
        if (normalized.length > 0) {
          return input.transcriptStore.getMergedMessages(canonicalSessionId, normalized);
        }
      } catch {
        // Try the next supported signature variant.
      }
    }
  }

  return cachedMessages;
};

export const resolveClaudeWorkingDirectory = async (
  workspaceManager: WorkspaceManager,
  workspaceId?: string | null,
): Promise<string> => {
  const normalizedWorkspaceId = asString(workspaceId);
  if (normalizedWorkspaceId) {
    const existing = workspaceManager.getWorkspaceById(normalizedWorkspaceId);
    const existingPath = existing?.getBasePath();
    if (existingPath) {
      return existingPath;
    }
    try {
      const workspace = await workspaceManager.getOrCreateWorkspace(normalizedWorkspaceId);
      const workspacePath = workspace.getBasePath();
      if (workspacePath) {
        return workspacePath;
      }
    } catch {
      // fall through to temp workspace
    }
  }

  try {
    return appConfigProvider.config.getTempWorkspaceDir();
  } catch {
    return process.cwd();
  }
};

export const loadClaudeSdkModuleSafe = async (
  cachedSdkModule: ClaudeSdkModuleLike | null,
): Promise<ClaudeSdkModuleLike | null> => {
  if (cachedSdkModule) {
    return cachedSdkModule;
  }

  try {
    const loaded = (await import(CLAUDE_AGENT_SDK_MODULE_NAME)) as ClaudeSdkModuleLike;
    return loaded;
  } catch {
    return null;
  }
};
