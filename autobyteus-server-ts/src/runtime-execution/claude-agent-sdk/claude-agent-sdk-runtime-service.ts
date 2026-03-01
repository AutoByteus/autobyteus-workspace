import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { LLMRuntime } from "autobyteus-ts/llm/runtimes.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { getWorkspaceManager } from "../../workspaces/workspace-manager.js";

const CLAUDE_AGENT_SDK_MODULE_NAME = "@anthropic-ai/claude-agent-sdk";
const MODEL_DISCOVERY_PROBE_PROMPT = "Enumerate supported models only.";

type ClaudeSdkModuleLike = {
  query?: (...args: unknown[]) => unknown;
  getSessionMessages?: (...args: unknown[]) => unknown;
  listModels?: (...args: unknown[]) => unknown;
  default?: {
    query?: (...args: unknown[]) => unknown;
    getSessionMessages?: (...args: unknown[]) => unknown;
    listModels?: (...args: unknown[]) => unknown;
  };
};

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const asNonEmptyRawString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const nowTimestampSeconds = (): number => Math.floor(Date.now() / 1000);

const DEFAULT_MODEL_DISPLAY_NAMES: Record<string, string> = {
  default: "Default (recommended)",
  "sonnet[1m]": "Sonnet (1M context)",
  opus: "Opus",
  "opus[1m]": "Opus (1M context)",
  haiku: "Haiku",
};

const readDefaultModelIdentifiers = (): string[] => {
  const fromEnv = process.env.CLAUDE_AGENT_SDK_MODELS;
  if (typeof fromEnv === "string" && fromEnv.trim().length > 0) {
    return Array.from(
      new Set(
        fromEnv
          .split(",")
          .map((item) => item.trim())
          .filter((item) => item.length > 0),
      ),
    );
  }
  return ["default", "sonnet[1m]", "opus", "opus[1m]", "haiku"];
};

const toModelInfo = (identifier: string, displayName?: string | null): ModelInfo => ({
  model_identifier: identifier,
  display_name:
    (typeof displayName === "string" && displayName.trim().length > 0
      ? displayName.trim()
      : null) ??
    DEFAULT_MODEL_DISPLAY_NAMES[identifier] ??
    identifier,
  value: identifier,
  canonical_name: identifier,
  provider: LLMProvider.ANTHROPIC,
  runtime: LLMRuntime.API,
});

export interface ClaudeRuntimeEvent {
  method: string;
  params?: Record<string, unknown>;
}

interface ClaudeSessionRuntimeOptions {
  modelIdentifier: string;
  workingDirectory: string;
  llmConfig?: Record<string, unknown> | null;
}

interface ClaudeRunSessionState {
  runId: string;
  sessionId: string;
  model: string;
  workingDirectory: string;
  hasCompletedTurn: boolean;
  runtimeMetadata: Record<string, unknown>;
  listeners: Set<(event: ClaudeRuntimeEvent) => void>;
  activeAbortController: AbortController | null;
  activeTurnId: string | null;
}

export class ClaudeAgentSdkRuntimeService {
  private readonly sessions = new Map<string, ClaudeRunSessionState>();
  private readonly workspaceManager = getWorkspaceManager();
  private readonly sessionMessagesBySessionId = new Map<string, Array<Record<string, unknown>>>();
  private cachedSdkModule: ClaudeSdkModuleLike | null = null;

  async createRunSession(
    runId: string,
    options: ClaudeSessionRuntimeOptions,
  ): Promise<{ sessionId: string; metadata: Record<string, unknown> }> {
    await this.closeRunSession(runId);
    const state: ClaudeRunSessionState = {
      runId,
      sessionId: runId,
      model: options.modelIdentifier,
      workingDirectory: options.workingDirectory,
      hasCompletedTurn: false,
      runtimeMetadata: {
        model: options.modelIdentifier,
        cwd: options.workingDirectory,
      },
      listeners: new Set(),
      activeAbortController: null,
      activeTurnId: null,
    };
    this.sessions.set(runId, state);
    if (!this.sessionMessagesBySessionId.has(state.sessionId)) {
      this.sessionMessagesBySessionId.set(state.sessionId, []);
    }
    return {
      sessionId: state.sessionId,
      metadata: {
        ...state.runtimeMetadata,
      },
    };
  }

  async restoreRunSession(
    runId: string,
    options: ClaudeSessionRuntimeOptions,
    runtimeReference: {
      sessionId?: string | null;
      metadata?: Record<string, unknown> | null;
    } | null,
  ): Promise<{ sessionId: string; metadata: Record<string, unknown> }> {
    await this.closeRunSession(runId);
    const resolvedSessionId = asString(runtimeReference?.sessionId);
    const sessionId = resolvedSessionId ?? runId;
    // Team external-runtime bootstraps may seed sessionId with memberRunId before any Claude turn exists.
    // Avoid sending resume on first turn until we have a confirmed non-placeholder Claude session id.
    const hasCompletedTurn = resolvedSessionId !== null && resolvedSessionId !== runId;
    const state: ClaudeRunSessionState = {
      runId,
      sessionId,
      model: options.modelIdentifier,
      workingDirectory: options.workingDirectory,
      hasCompletedTurn,
      runtimeMetadata: {
        ...(runtimeReference?.metadata ?? {}),
        model: options.modelIdentifier,
        cwd: options.workingDirectory,
      },
      listeners: new Set(),
      activeAbortController: null,
      activeTurnId: null,
    };
    this.sessions.set(runId, state);
    if (!this.sessionMessagesBySessionId.has(sessionId)) {
      this.sessionMessagesBySessionId.set(sessionId, []);
    }
    return {
      sessionId,
      metadata: {
        ...state.runtimeMetadata,
      },
    };
  }

  hasRunSession(runId: string): boolean {
    return this.sessions.has(runId);
  }

  getRunRuntimeReference(
    runId: string,
  ): { sessionId: string; metadata: Record<string, unknown> } | null {
    const state = this.sessions.get(runId);
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
  }

  subscribeToRunEvents(runId: string, listener: (event: ClaudeRuntimeEvent) => void): () => void {
    const state = this.sessions.get(runId);
    if (!state) {
      return () => {};
    }
    state.listeners.add(listener);
    return () => {
      state.listeners.delete(listener);
    };
  }

  async sendTurn(runId: string, message: AgentInputUserMessage): Promise<{ turnId: string | null }> {
    const state = this.requireSession(runId);
    const content = asString(message.content);
    if (!content) {
      throw new Error("Claude runtime message content is required.");
    }

    const turnId = `${runId}:turn:${Date.now()}`;
    state.activeTurnId = turnId;
    this.recordSessionMessage(state.sessionId, {
      role: "user",
      content,
      createdAt: nowTimestampSeconds(),
    });

    this.emitEvent(state, {
      method: "turn/started",
      params: {
        turnId,
      },
    });

    const abortController = new AbortController();
    state.activeAbortController = abortController;
    let userMessageBoundToResolvedSession = false;

    let assistantOutput = "";
    try {
      const stream = await this.invokeQueryStream(state, content, abortController.signal);
      for await (const chunk of stream) {
        const normalized = normalizeClaudeStreamChunk(chunk);
        if (normalized.sessionId && normalized.sessionId !== state.sessionId) {
          const previousSessionId = state.sessionId;
          state.sessionId = normalized.sessionId;
          if (!this.sessionMessagesBySessionId.has(state.sessionId)) {
            this.sessionMessagesBySessionId.set(state.sessionId, []);
          }
          // Claude may return a canonical session id after the first stream chunk.
          // Mirror the triggering user turn into the resolved session transcript.
          if (!userMessageBoundToResolvedSession && previousSessionId !== state.sessionId) {
            this.recordSessionMessage(state.sessionId, {
              role: "user",
              content,
              createdAt: nowTimestampSeconds(),
            });
            userMessageBoundToResolvedSession = true;
          }
        }

        if (normalized.delta) {
          if (normalized.source === "result" && assistantOutput.length > 0) {
            continue;
          }
          assistantOutput += normalized.delta;
          this.emitEvent(state, {
            method: "item/outputText/delta",
            params: {
              id: turnId,
              turnId,
              delta: normalized.delta,
            },
          });
        }
      }

      if (assistantOutput.length > 0) {
        this.recordSessionMessage(state.sessionId, {
          role: "assistant",
          content: assistantOutput,
          createdAt: nowTimestampSeconds(),
        });
      }

      this.emitEvent(state, {
        method: "item/outputText/completed",
        params: {
          id: turnId,
          turnId,
          text: assistantOutput,
        },
      });
      this.emitEvent(state, {
        method: "turn/completed",
        params: {
          turnId,
        },
      });
      state.hasCompletedTurn = true;
      return { turnId };
    } catch (error) {
      this.emitEvent(state, {
        method: "error",
        params: {
          code: "CLAUDE_RUNTIME_TURN_FAILED",
          message: String(error),
        },
      });
      throw error;
    } finally {
      state.activeAbortController = null;
      state.activeTurnId = null;
    }
  }

  async approveTool(
    runId: string,
    _invocationId: string,
    _approved: boolean,
  ): Promise<void> {
    this.requireSession(runId);
    throw new Error("Claude Agent SDK runtime does not support tool approval routing.");
  }

  async interruptRun(runId: string): Promise<void> {
    const state = this.requireSession(runId);
    state.activeAbortController?.abort();
    state.activeAbortController = null;
    this.emitEvent(state, {
      method: "turn/interrupted",
      params: {
        turnId: state.activeTurnId,
      },
    });
  }

  async terminateRun(runId: string): Promise<void> {
    const state = this.sessions.get(runId);
    if (!state) {
      return;
    }
    state.activeAbortController?.abort();
    this.emitEvent(state, {
      method: "session/terminated",
      params: {
        runId,
      },
    });
    await this.closeRunSession(runId);
  }

  async closeRunSession(runId: string): Promise<void> {
    const state = this.sessions.get(runId);
    if (!state) {
      return;
    }
    state.activeAbortController?.abort();
    state.listeners.clear();
    this.sessions.delete(runId);
  }

  async listModels(): Promise<ModelInfo[]> {
    const sdk = await this.loadSdkModuleSafe();
    const supportedRows = await this.tryGetSupportedModelsFromQueryControl(sdk);
    if (supportedRows.length > 0) {
      return supportedRows.map((row) => toModelInfo(row.identifier, row.displayName));
    }

    const listModelsFn = this.resolveSdkFunction(sdk, "listModels");

    if (listModelsFn) {
      const rows = await this.tryCallWithVariants(listModelsFn, [[], [{} as unknown]]);
      const normalized = normalizeModelDescriptors(rows);
      if (normalized.length > 0) {
        return normalized.map((row) => toModelInfo(row.identifier, row.displayName));
      }
    }

    return readDefaultModelIdentifiers().map((identifier) => toModelInfo(identifier));
  }

  async getSessionMessages(
    sessionId: string,
  ): Promise<Array<Record<string, unknown>>> {
    const normalizedSessionId = asString(sessionId);
    if (!normalizedSessionId) {
      return [];
    }

    const sdk = await this.loadSdkModuleSafe();
    const getSessionMessagesFn = this.resolveSdkFunction(sdk, "getSessionMessages");
    if (getSessionMessagesFn) {
      const raw = await this.tryCallWithVariants(getSessionMessagesFn, [
        [{ sessionId: normalizedSessionId }],
        [normalizedSessionId],
      ]);
      const normalized = normalizeSessionMessages(raw);
      if (normalized.length > 0) {
        return normalized;
      }
    }

    return this.sessionMessagesBySessionId.get(normalizedSessionId) ?? [];
  }

  async resolveWorkingDirectory(workspaceId?: string | null): Promise<string> {
    const normalizedWorkspaceId = asString(workspaceId);
    if (normalizedWorkspaceId) {
      const existing = this.workspaceManager.getWorkspaceById(normalizedWorkspaceId);
      const existingPath = existing?.getBasePath();
      if (existingPath) {
        return existingPath;
      }
      try {
        const workspace = await this.workspaceManager.getOrCreateWorkspace(normalizedWorkspaceId);
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
  }

  private async invokeQueryStream(
    state: ClaudeRunSessionState,
    prompt: string,
    signal: AbortSignal,
  ): Promise<AsyncIterable<unknown>> {
    const sdk = await this.loadSdkModuleSafe();
    const queryFn = this.resolveSdkFunction(sdk, "query");
    if (!queryFn) {
      throw new Error(`${CLAUDE_AGENT_SDK_MODULE_NAME} does not export query().`);
    }

    const queryOptions = {
      model: state.model,
      cwd: state.workingDirectory,
      maxTurns: 1,
      permissionMode: "default",
      signal,
      ...(state.hasCompletedTurn ? { resume: state.sessionId } : {}),
    };

    const result = await this.tryCallWithVariants(queryFn, [
      [{ prompt, options: queryOptions }],
      [{ prompt, options: { ...queryOptions, workingDirectory: state.workingDirectory } }],
      [queryOptions],
      [prompt, queryOptions],
      [prompt],
    ]);

    const stream = asAsyncIterable(result);
    if (!stream) {
      throw new Error("Claude SDK query() did not return an async iterable stream.");
    }
    return stream;
  }

  private emitEvent(state: ClaudeRunSessionState, event: ClaudeRuntimeEvent): void {
    for (const listener of state.listeners) {
      try {
        listener(event);
      } catch (error) {
        logger.warn(`Claude runtime event listener failed: ${String(error)}`);
      }
    }
  }

  private recordSessionMessage(sessionId: string, message: Record<string, unknown>): void {
    const existing = this.sessionMessagesBySessionId.get(sessionId) ?? [];
    existing.push(message);
    this.sessionMessagesBySessionId.set(sessionId, existing);
  }

  private async tryGetSupportedModelsFromQueryControl(
    sdk: ClaudeSdkModuleLike | null,
  ): Promise<NormalizedModelDescriptor[]> {
    const queryFn = this.resolveSdkFunction(sdk, "query");
    if (!queryFn) {
      return [];
    }

    let controlLike: Record<string, unknown> | null = null;
    try {
      const result = await this.tryCallWithVariants(queryFn, [
        [
          {
            prompt: MODEL_DISCOVERY_PROBE_PROMPT,
            options: {
              maxTurns: 0,
              permissionMode: "plan",
              cwd: process.cwd(),
            },
          },
        ],
        [
          {
            prompt: MODEL_DISCOVERY_PROBE_PROMPT,
            options: {
              maxTurns: 0,
              permissionMode: "plan",
            },
          },
        ],
        [
          {
            prompt: MODEL_DISCOVERY_PROBE_PROMPT,
            maxTurns: 0,
            permissionMode: "plan",
            cwd: process.cwd(),
          },
        ],
      ]);

      controlLike = asObject(result);
      if (!controlLike) {
        return [];
      }

      const supportedModelsFn =
        typeof controlLike.supportedModels === "function"
          ? (controlLike.supportedModels as (...args: unknown[]) => Promise<unknown>)
          : null;
      if (supportedModelsFn) {
        const rows = await supportedModelsFn.call(result);
        const normalized = normalizeModelDescriptors(rows);
        if (normalized.length > 0) {
          return normalized;
        }
      }

      const initializationResultFn =
        typeof controlLike.initializationResult === "function"
          ? (controlLike.initializationResult as (...args: unknown[]) => Promise<unknown>)
          : null;
      if (initializationResultFn) {
        const initializationResult = await initializationResultFn.call(result);
        const normalized = normalizeModelDescriptors(asObject(initializationResult)?.models);
        if (normalized.length > 0) {
          return normalized;
        }
      }

      return [];
    } catch {
      return [];
    } finally {
      await this.closeQueryControl(controlLike);
    }
  }

  private async closeQueryControl(controlLike: Record<string, unknown> | null): Promise<void> {
    if (!controlLike) {
      return;
    }

    const interruptFn =
      typeof controlLike.interrupt === "function"
        ? (controlLike.interrupt as (...args: unknown[]) => Promise<unknown>)
        : null;
    if (interruptFn) {
      try {
        await interruptFn.call(controlLike);
      } catch {
        // best-effort cleanup
      }
    }

    const closeFn =
      typeof controlLike.close === "function"
        ? (controlLike.close as (...args: unknown[]) => unknown)
        : null;
    if (closeFn) {
      try {
        closeFn.call(controlLike);
      } catch {
        // best-effort cleanup
      }
    }
  }

  private async loadSdkModuleSafe(): Promise<ClaudeSdkModuleLike | null> {
    if (this.cachedSdkModule) {
      return this.cachedSdkModule;
    }

    try {
      const moduleName = CLAUDE_AGENT_SDK_MODULE_NAME;
      const loaded = (await import(moduleName)) as ClaudeSdkModuleLike;
      this.cachedSdkModule = loaded;
      return loaded;
    } catch {
      return null;
    }
  }

  private resolveSdkFunction(
    sdk: ClaudeSdkModuleLike | null,
    functionName: "query" | "getSessionMessages" | "listModels",
  ): ((...args: unknown[]) => unknown) | null {
    if (!sdk) {
      return null;
    }
    const candidate = sdk[functionName];
    if (typeof candidate === "function") {
      return candidate as (...args: unknown[]) => unknown;
    }
    const nested = sdk.default?.[functionName];
    if (typeof nested === "function") {
      return nested as (...args: unknown[]) => unknown;
    }
    return null;
  }

  private async tryCallWithVariants(
    fn: (...args: unknown[]) => unknown,
    variants: unknown[][],
  ): Promise<unknown> {
    let lastError: unknown = null;
    for (const args of variants) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;
      }
    }
    if (lastError) {
      throw lastError;
    }
    return null;
  }

  private requireSession(runId: string): ClaudeRunSessionState {
    const session = this.sessions.get(runId);
    if (!session) {
      throw new Error(`Claude runtime session '${runId}' is not available.`);
    }
    return session;
  }
}

const asAsyncIterable = (value: unknown): AsyncIterable<unknown> | null => {
  if (value && typeof value === "object") {
    const direct = value as { [Symbol.asyncIterator]?: () => AsyncIterator<unknown> };
    if (typeof direct[Symbol.asyncIterator] === "function") {
      return value as AsyncIterable<unknown>;
    }

    const objectValue = value as Record<string, unknown>;
    if (objectValue.stream && typeof objectValue.stream === "object") {
      const stream = objectValue.stream as { [Symbol.asyncIterator]?: () => AsyncIterator<unknown> };
      if (typeof stream[Symbol.asyncIterator] === "function") {
        return objectValue.stream as AsyncIterable<unknown>;
      }
    }

    if (objectValue.events && typeof objectValue.events === "object") {
      const events = objectValue.events as { [Symbol.asyncIterator]?: () => AsyncIterator<unknown> };
      if (typeof events[Symbol.asyncIterator] === "function") {
        return objectValue.events as AsyncIterable<unknown>;
      }
    }
  }

  if (Array.isArray(value)) {
    return (async function* () {
      for (const item of value) {
        yield item;
      }
    })();
  }

  return null;
};

type NormalizedModelDescriptor = {
  identifier: string;
  displayName: string | null;
};

const normalizeModelDescriptors = (value: unknown): NormalizedModelDescriptor[] => {
  if (!value) {
    return [];
  }

  const asArrayLike = Array.isArray(value)
    ? value
    : asObject(value)?.models && Array.isArray(asObject(value)?.models)
      ? (asObject(value)?.models as unknown[])
      : asObject(value)?.data && Array.isArray(asObject(value)?.data)
        ? (asObject(value)?.data as unknown[])
        : [];

  const descriptors = new Map<string, NormalizedModelDescriptor>();
  for (const row of asArrayLike) {
    if (typeof row === "string") {
      const existing = descriptors.get(row);
      if (!existing) {
        descriptors.set(row, {
          identifier: row,
          displayName: DEFAULT_MODEL_DISPLAY_NAMES[row] ?? null,
        });
      }
      continue;
    }
    const payload = asObject(row);
    if (!payload) {
      continue;
    }
    const identifier =
      asString(payload.value) ??
      asString(payload.model_identifier) ??
      asString(payload.modelIdentifier) ??
      asString(payload.id) ??
      asString(payload.name);
    if (identifier) {
      const displayName =
        asString(payload.displayName) ??
        asString(payload.display_name) ??
        asString(payload.label) ??
        (asString(payload.name) !== identifier ? asString(payload.name) : null);
      const existing = descriptors.get(identifier);
      if (!existing) {
        descriptors.set(identifier, { identifier, displayName });
        continue;
      }
      if (!existing.displayName && displayName) {
        descriptors.set(identifier, { identifier, displayName });
      }
    }
  }

  return Array.from(descriptors.values());
};

const normalizeSessionMessages = (value: unknown): Array<Record<string, unknown>> => {
  if (!value) {
    return [];
  }
  const payload = asObject(value);
  const rows = Array.isArray(value)
    ? value
    : Array.isArray(payload?.messages)
      ? (payload?.messages as unknown[])
      : Array.isArray(payload?.data)
        ? (payload?.data as unknown[])
        : [];

  return rows
    .map((row) => asObject(row))
    .filter((row): row is Record<string, unknown> => row !== null);
};

const normalizeClaudeStreamChunk = (
  chunk: unknown,
): { sessionId: string | null; delta: string | null; source: "stream_delta" | "assistant_message" | "result" | "unknown" } => {
  if (typeof chunk === "string") {
    return {
      sessionId: null,
      delta: chunk,
      source: "stream_delta",
    };
  }

  const payload = asObject(chunk);
  if (!payload) {
    return {
      sessionId: null,
      delta: null,
      source: "unknown",
    };
  }

  const sessionId =
    asString(payload.sessionId) ??
    asString(payload.session_id) ??
    asString(payload.threadId) ??
    asString(payload.thread_id) ??
    null;

  const delta =
    asNonEmptyRawString(payload.delta) ??
    asNonEmptyRawString(payload.textDelta) ??
    asNonEmptyRawString(payload.text_delta) ??
    asNonEmptyRawString(payload.output_text_delta) ??
    null;

  if (delta) {
    return { sessionId, delta, source: "stream_delta" };
  }

  const nested = asObject(payload.message) ?? asObject(payload.content) ?? null;
  const nestedDelta =
    asNonEmptyRawString(nested?.delta) ??
    asNonEmptyRawString(nested?.textDelta) ??
    asNonEmptyRawString(nested?.text_delta) ??
    null;
  if (nestedDelta) {
    return {
      sessionId,
      delta: nestedDelta,
      source: "stream_delta",
    };
  }

  const assistantMessage = asObject(payload.message);
  const assistantMessageText = extractAssistantMessageText(assistantMessage);
  if (assistantMessageText) {
    return {
      sessionId,
      delta: assistantMessageText,
      source: "assistant_message",
    };
  }

  const fallbackResult =
    asNonEmptyRawString(payload.result) ?? asNonEmptyRawString(payload.text) ?? null;
  if (fallbackResult) {
    return {
      sessionId,
      delta: fallbackResult,
      source: "result",
    };
  }

  return {
    sessionId,
    delta: null,
    source: "unknown",
  };
};

const extractAssistantMessageText = (messagePayload: Record<string, unknown> | null): string | null => {
  if (!messagePayload) {
    return null;
  }

  const content = messagePayload.content;
  if (typeof content === "string" && content.length > 0) {
    return content;
  }

  if (!Array.isArray(content)) {
    return null;
  }

  const textParts: string[] = [];
  for (const entry of content) {
    if (typeof entry === "string" && entry.length > 0) {
      textParts.push(entry);
      continue;
    }
    const block = asObject(entry);
    if (!block) {
      continue;
    }
    const text =
      asNonEmptyRawString(block.text) ??
      asNonEmptyRawString(block.delta) ??
      asNonEmptyRawString(block.textDelta) ??
      asNonEmptyRawString(block.text_delta) ??
      null;
    if (text) {
      textParts.push(text);
    }
  }

  return textParts.length > 0 ? textParts.join("") : null;
};

let cachedClaudeAgentSdkRuntimeService: ClaudeAgentSdkRuntimeService | null = null;

export const getClaudeAgentSdkRuntimeService = (): ClaudeAgentSdkRuntimeService => {
  if (!cachedClaudeAgentSdkRuntimeService) {
    cachedClaudeAgentSdkRuntimeService = new ClaudeAgentSdkRuntimeService();
  }
  return cachedClaudeAgentSdkRuntimeService;
};
