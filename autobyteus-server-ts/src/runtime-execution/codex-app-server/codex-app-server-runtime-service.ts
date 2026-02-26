import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { ContextFileType } from "autobyteus-ts/agent/message/context-file-type.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { getWorkspaceManager } from "../../workspaces/workspace-manager.js";
import { CodexAppServerClient } from "./codex-app-server-client.js";

type JsonObject = Record<string, unknown>;

export type CodexRuntimeEvent = {
  method: string;
  params: JsonObject;
  request_id?: string | number;
};

type CodexApprovalRecord = {
  requestId: string | number;
  method: string;
  invocationId: string;
  itemId: string;
  approvalId: string | null;
};

type CodexRunSessionState = {
  runId: string;
  client: CodexAppServerClient;
  threadId: string;
  model: string | null;
  workingDirectory: string;
  reasoningEffort: string | null;
  activeTurnId: string | null;
  approvalRecords: Map<string, CodexApprovalRecord>;
  listeners: Set<(event: CodexRuntimeEvent) => void>;
  unbindHandlers: Array<() => void>;
};

type SessionRuntimeOptions = {
  modelIdentifier: string | null;
  workingDirectory: string;
  llmConfig?: Record<string, unknown> | null;
  runtimeMetadata?: Record<string, unknown> | null;
};

const DEFAULT_APP_SERVER_COMMAND = "codex";
const DEFAULT_APP_SERVER_ARGS = ["app-server"];
const DEFAULT_APPROVAL_POLICY = "on-request";
const DEFAULT_SANDBOX_MODE = "workspace-write";
const DEFAULT_REQUEST_TIMEOUT_MS = 120_000;

const VALID_APPROVAL_POLICIES = new Set(["untrusted", "on-failure", "on-request", "never"]);
const VALID_SANDBOX_MODES = new Set(["read-only", "workspace-write", "danger-full-access"]);
const VALID_REASONING_EFFORTS = new Set(["none", "low", "medium", "high", "xhigh"]);

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
};

const asObject = (value: unknown): JsonObject | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export const normalizeCodexReasoningEffort = (value: unknown): string | null => {
  const normalized = asString(value)?.toLowerCase() ?? null;
  if (!normalized || !VALID_REASONING_EFFORTS.has(normalized)) {
    return null;
  }
  return normalized;
};

const resolveEffortFromConfig = (
  llmConfig: Record<string, unknown> | null | undefined,
): string | null => normalizeCodexReasoningEffort(llmConfig?.reasoning_effort);

const resolveEffortFromRuntimeMetadata = (
  runtimeMetadata: Record<string, unknown> | null | undefined,
): string | null =>
  normalizeCodexReasoningEffort(
    runtimeMetadata?.reasoning_effort ?? runtimeMetadata?.reasoningEffort,
  );

export const resolveCodexSessionReasoningEffort = (
  llmConfig: Record<string, unknown> | null | undefined,
  runtimeMetadata: Record<string, unknown> | null | undefined,
): string | null => resolveEffortFromConfig(llmConfig) ?? resolveEffortFromRuntimeMetadata(runtimeMetadata);

const toReasoningEffortConfigSchema = (
  supportedEfforts: string[],
  defaultReasoningEffort: string | null,
): Record<string, unknown> | undefined => {
  if (supportedEfforts.length === 0) {
    return undefined;
  }

  const enumValues = supportedEfforts.slice();
  if (defaultReasoningEffort && !enumValues.includes(defaultReasoningEffort)) {
    enumValues.push(defaultReasoningEffort);
  }

  return {
    parameters: [
      {
        name: "reasoning_effort",
        type: "enum",
        description:
          "Controls reasoning depth for Codex turn/start. Higher effort may improve quality but increase latency.",
        required: false,
        default_value: defaultReasoningEffort ?? enumValues[0] ?? null,
        enum_values: enumValues,
      },
    ],
  };
};

const toReasoningDisplayLabel = (displayName: string, defaultReasoningEffort: string | null): string =>
  defaultReasoningEffort ? `${displayName} (default reasoning: ${defaultReasoningEffort})` : displayName;

const toSupportedReasoningEfforts = (row: JsonObject): string[] => {
  const source = row.supportedReasoningEfforts ?? row.supported_reasoning_efforts;
  if (!Array.isArray(source)) {
    return [];
  }

  const efforts: string[] = [];
  for (const entry of source) {
    const objectEntry = asObject(entry);
    const value = normalizeCodexReasoningEffort(
      objectEntry?.reasoningEffort ?? objectEntry?.reasoning_effort ?? objectEntry?.effort ?? entry,
    );
    if (value && !efforts.includes(value)) {
      efforts.push(value);
    }
  }
  return efforts;
};

export const mapCodexModelListRowToModelInfo = (row: unknown): ModelInfo | null => {
  const model = asObject(row);
  const modelName = asString(model?.model) ?? asString(model?.id);
  if (!model || !modelName) {
    return null;
  }

  const defaultReasoningEffort = normalizeCodexReasoningEffort(
    model.defaultReasoningEffort ?? model.default_reasoning_effort,
  );
  const supportedReasoningEfforts = toSupportedReasoningEfforts(model);
  const configSchema = toReasoningEffortConfigSchema(supportedReasoningEfforts, defaultReasoningEffort);
  const displayName = asString(model.displayName) ?? modelName;

  return {
    model_identifier: modelName,
    display_name: toReasoningDisplayLabel(displayName, defaultReasoningEffort),
    value: modelName,
    canonical_name: modelName,
    provider: LLMProvider.OPENAI,
    runtime: "api",
    config_schema: configSchema,
  };
};

const parseArgs = (): string[] => {
  const jsonArgs = process.env.CODEX_APP_SERVER_ARGS_JSON?.trim();
  if (jsonArgs) {
    try {
      const parsed = JSON.parse(jsonArgs);
      if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
        return parsed as string[];
      }
    } catch (error) {
      logger.warn(`Failed to parse CODEX_APP_SERVER_ARGS_JSON: ${String(error)}`);
    }
  }

  const argString = process.env.CODEX_APP_SERVER_ARGS?.trim();
  if (!argString) {
    return DEFAULT_APP_SERVER_ARGS;
  }
  return argString
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
};

const normalizeApprovalPolicy = (): string => {
  const policy = process.env.CODEX_APP_SERVER_APPROVAL_POLICY?.trim() ?? DEFAULT_APPROVAL_POLICY;
  if (VALID_APPROVAL_POLICIES.has(policy)) {
    return policy;
  }
  logger.warn(
    `Invalid CODEX_APP_SERVER_APPROVAL_POLICY '${policy}', falling back to '${DEFAULT_APPROVAL_POLICY}'.`,
  );
  return DEFAULT_APPROVAL_POLICY;
};

const normalizeSandboxMode = (): string => {
  const sandbox = process.env.CODEX_APP_SERVER_SANDBOX?.trim() ?? DEFAULT_SANDBOX_MODE;
  if (VALID_SANDBOX_MODES.has(sandbox)) {
    return sandbox;
  }
  logger.warn(
    `Invalid CODEX_APP_SERVER_SANDBOX '${sandbox}', falling back to '${DEFAULT_SANDBOX_MODE}'.`,
  );
  return DEFAULT_SANDBOX_MODE;
};

const resolveRequestTimeoutMs = (): number => {
  const raw = Number(process.env.CODEX_APP_SERVER_REQUEST_TIMEOUT_MS ?? DEFAULT_REQUEST_TIMEOUT_MS);
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_REQUEST_TIMEOUT_MS;
  }
  return Math.floor(raw);
};

const resolveLaunchCommand = (): string =>
  process.env.CODEX_APP_SERVER_COMMAND?.trim() || DEFAULT_APP_SERVER_COMMAND;

const resolveDefaultModel = (): string | null => asString(process.env.CODEX_APP_SERVER_MODEL);

const resolveThreadId = (payload: unknown): string | null => {
  const response = asObject(payload);
  const thread = asObject(response?.thread);
  return asString(thread?.id);
};

const resolveTurnId = (payload: unknown): string | null => {
  const response = asObject(payload);
  const turn = asObject(response?.turn);
  return asString(turn?.id);
};

const resolveThreadIdFromNotification = (params: JsonObject): string | null =>
  asString(params.threadId);

const resolveApprovalInvocationCandidates = (params: JsonObject): {
  primary: string | null;
  aliases: string[];
  itemId: string | null;
  approvalId: string | null;
} => {
  const itemId = asString(params.itemId);
  const approvalId = asString(params.approvalId);
  if (!itemId) {
    return { primary: null, aliases: [], itemId: null, approvalId };
  }
  if (!approvalId) {
    return { primary: itemId, aliases: [], itemId, approvalId: null };
  }
  return {
    primary: `${itemId}:${approvalId}`,
    aliases: [itemId],
    itemId,
    approvalId,
  };
};

const toCodexUserInput = (message: AgentInputUserMessage): Array<JsonObject> => {
  const baseText = message.content.trim();
  const textLines = [baseText];
  const inputs: Array<JsonObject> = [];

  for (const contextFile of message.contextFiles ?? []) {
    if (contextFile.fileType === ContextFileType.IMAGE) {
      const uri = contextFile.uri.trim();
      if (!uri) {
        continue;
      }
      if (/^https?:\/\//i.test(uri)) {
        inputs.push({ type: "image", url: uri });
      } else {
        inputs.push({ type: "localImage", path: uri });
      }
      continue;
    }

    if (contextFile.uri.trim()) {
      textLines.push(`Context file: ${contextFile.uri.trim()}`);
    }
  }

  inputs.unshift({
    type: "text",
    text: textLines.filter((line) => line.length > 0).join("\n"),
    text_elements: [],
  });
  return inputs;
};

export class CodexAppServerRuntimeService {
  private readonly sessions = new Map<string, CodexRunSessionState>();
  private readonly workspaceManager = getWorkspaceManager();

  async createRunSession(
    runId: string,
    options: SessionRuntimeOptions,
  ): Promise<{ threadId: string; metadata: JsonObject }> {
    await this.closeRunSession(runId);
    const state = await this.startSession(runId, options, null);
    this.sessions.set(runId, state);
    return {
      threadId: state.threadId,
      metadata: {
        model: state.model,
        cwd: state.workingDirectory,
        reasoning_effort: state.reasoningEffort,
      },
    };
  }

  async restoreRunSession(
    runId: string,
    options: SessionRuntimeOptions,
    runtimeReference: {
      threadId: string | null;
      metadata?: Record<string, unknown> | null;
    } | null,
  ): Promise<{ threadId: string; metadata: JsonObject }> {
    await this.closeRunSession(runId);
    const state = await this.startSession(
      runId,
      {
        ...options,
        runtimeMetadata: runtimeReference?.metadata ?? options.runtimeMetadata ?? null,
      },
      runtimeReference?.threadId ?? null,
    );
    this.sessions.set(runId, state);
    return {
      threadId: state.threadId,
      metadata: {
        ...(runtimeReference?.metadata ?? {}),
        model: state.model,
        cwd: state.workingDirectory,
        reasoning_effort: state.reasoningEffort,
      },
    };
  }

  hasRunSession(runId: string): boolean {
    return this.sessions.has(runId);
  }

  subscribeToRunEvents(
    runId: string,
    listener: (event: CodexRuntimeEvent) => void,
  ): () => void {
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
    const payload = await state.client.request<unknown>("turn/start", {
      threadId: state.threadId,
      input: toCodexUserInput(message),
      cwd: state.workingDirectory,
      model: state.model,
      effort: state.reasoningEffort,
      summary: "auto",
      personality: null,
      outputSchema: null,
      collaborationMode: null,
    });

    const turnId = resolveTurnId(payload);
    state.activeTurnId = turnId;
    return { turnId };
  }

  async interruptRun(runId: string, turnId?: string | null): Promise<void> {
    const state = this.requireSession(runId);
    const activeTurnId = asString(turnId) ?? state.activeTurnId;
    if (!activeTurnId) {
      throw new Error("No active turn id is available for interruption.");
    }
    await state.client.request("turn/interrupt", {
      threadId: state.threadId,
      turnId: activeTurnId,
    });
  }

  async approveTool(
    runId: string,
    invocationId: string,
    approved: boolean,
  ): Promise<void> {
    const state = this.requireSession(runId);
    const approval = this.findApprovalRecord(state, invocationId);
    if (!approval) {
      throw new Error(`No pending approval found for invocation '${invocationId}'.`);
    }

    const decision = approved ? "accept" : "decline";
    state.client.respondSuccess(approval.requestId, {
      decision,
    });
    this.deleteApprovalRecord(state, approval);
  }

  async terminateRun(runId: string): Promise<void> {
    await this.closeRunSession(runId);
  }

  async closeRunSession(runId: string): Promise<void> {
    const state = this.sessions.get(runId);
    if (!state) {
      return;
    }
    this.sessions.delete(runId);
    state.listeners.clear();
    state.approvalRecords.clear();
    for (const unbind of state.unbindHandlers) {
      try {
        unbind();
      } catch {
        // ignore
      }
    }
    await state.client.close();
  }

  async listModels(cwd?: string): Promise<ModelInfo[]> {
    const client = new CodexAppServerClient({
      command: resolveLaunchCommand(),
      args: parseArgs(),
      cwd: cwd ?? process.cwd(),
      requestTimeoutMs: resolveRequestTimeoutMs(),
    });

    try {
      await client.start();
      await this.initializeClient(client);
      const models: ModelInfo[] = [];
      let cursor: string | null = null;
      do {
        const response = await client.request<unknown>("model/list", {
          cursor,
          includeHidden: false,
        });
        const data = asObject(response);
        const rows = Array.isArray(data?.data) ? data.data : [];
        for (const row of rows) {
          const mapped = mapCodexModelListRowToModelInfo(row);
          if (mapped) {
            models.push(mapped);
          }
        }
        cursor = asString(data?.nextCursor);
      } while (cursor);
      return models;
    } finally {
      await client.close();
    }
  }

  private async startSession(
    runId: string,
    options: SessionRuntimeOptions,
    resumeThreadId: string | null,
  ): Promise<CodexRunSessionState> {
    const model = asString(options.modelIdentifier) ?? resolveDefaultModel();
    const workingDirectory = options.workingDirectory || process.cwd();
    const reasoningEffort = resolveCodexSessionReasoningEffort(
      options.llmConfig,
      options.runtimeMetadata,
    );
    const client = new CodexAppServerClient({
      command: resolveLaunchCommand(),
      args: parseArgs(),
      cwd: workingDirectory,
      requestTimeoutMs: resolveRequestTimeoutMs(),
    });
    await client.start();
    await this.initializeClient(client);

    const threadId = resumeThreadId
      ? await this.resumeThread(client, resumeThreadId, workingDirectory, model)
      : await this.startThread(client, workingDirectory, model);
    if (!threadId) {
      await client.close();
      throw new Error("Codex thread id was not returned by app server.");
    }

    const state: CodexRunSessionState = {
      runId,
      client,
      threadId,
      model,
      workingDirectory,
      reasoningEffort,
      activeTurnId: null,
      approvalRecords: new Map(),
      listeners: new Set(),
      unbindHandlers: [],
    };

    state.unbindHandlers.push(
      client.onNotification((message) => {
        this.handleNotification(state, message.method, message.params);
      }),
    );
    state.unbindHandlers.push(
      client.onServerRequest((message) => {
        this.handleServerRequest(state, message.id, message.method, message.params);
      }),
    );
    state.unbindHandlers.push(
      client.onClose((error) => {
        this.sessions.delete(runId);
        if (error) {
          this.emitEvent(state, {
            method: "error",
            params: {
              code: "CODEX_APP_SERVER_CLOSED",
              message: error.message,
            },
          });
        }
      }),
    );
    return state;
  }

  private async initializeClient(client: CodexAppServerClient): Promise<void> {
    await client.request("initialize", {
      clientInfo: {
        name: "autobyteus-server-ts",
        version: "0.1.1",
      },
      capabilities: null,
    });
    client.notify("initialized", {});
  }

  private async startThread(
    client: CodexAppServerClient,
    cwd: string,
    model: string | null,
  ): Promise<string | null> {
    const response = await client.request<unknown>("thread/start", {
      model,
      modelProvider: null,
      cwd,
      approvalPolicy: normalizeApprovalPolicy(),
      sandbox: normalizeSandboxMode(),
      config: null,
      baseInstructions: null,
      developerInstructions: null,
      personality: null,
      ephemeral: false,
      experimentalRawEvents: false,
      persistExtendedHistory: false,
    });
    return resolveThreadId(response);
  }

  private async resumeThread(
    client: CodexAppServerClient,
    threadId: string,
    cwd: string,
    model: string | null,
  ): Promise<string | null> {
    try {
      const response = await client.request<unknown>("thread/resume", {
        threadId,
        history: null,
        path: null,
        model,
        modelProvider: null,
        cwd,
        approvalPolicy: normalizeApprovalPolicy(),
        sandbox: normalizeSandboxMode(),
        config: null,
        baseInstructions: null,
        developerInstructions: null,
        personality: null,
        persistExtendedHistory: false,
      });
      return resolveThreadId(response);
    } catch (error) {
      logger.warn(`Failed to resume Codex thread '${threadId}', starting a new thread: ${String(error)}`);
      return this.startThread(client, cwd, model);
    }
  }

  private handleNotification(
    state: CodexRunSessionState,
    method: string,
    params: JsonObject,
  ): void {
    if (method === "turn/started") {
      const turn = asObject(params.turn);
      state.activeTurnId = asString(turn?.id);
    } else if (method === "turn/completed") {
      state.activeTurnId = null;
    } else if (method === "thread/started") {
      const thread = asObject(params.thread);
      const nextThreadId = asString(thread?.id);
      if (nextThreadId) {
        state.threadId = nextThreadId;
      }
    } else if (method === "thread/tokenUsage/updated") {
      const nextThreadId = resolveThreadIdFromNotification(params);
      if (nextThreadId) {
        state.threadId = nextThreadId;
      }
    }

    this.emitEvent(state, { method, params });
  }

  private handleServerRequest(
    state: CodexRunSessionState,
    requestId: string | number,
    method: string,
    params: JsonObject,
  ): void {
    if (
      method !== "item/commandExecution/requestApproval" &&
      method !== "item/fileChange/requestApproval"
    ) {
      state.client.respondError(
        requestId,
        -32601,
        `Unsupported server request method '${method}'.`,
      );
      return;
    }

    const invocation = resolveApprovalInvocationCandidates(params);
    if (!invocation.primary || !invocation.itemId) {
      state.client.respondError(requestId, -32602, "Approval request missing itemId.");
      return;
    }

    const record: CodexApprovalRecord = {
      requestId,
      method,
      invocationId: invocation.primary,
      itemId: invocation.itemId,
      approvalId: invocation.approvalId,
    };
    state.approvalRecords.set(invocation.primary, record);
    for (const alias of invocation.aliases) {
      state.approvalRecords.set(alias, record);
    }

    this.emitEvent(state, {
      method,
      params,
      request_id: requestId,
    });
  }

  private emitEvent(state: CodexRunSessionState, event: CodexRuntimeEvent): void {
    for (const listener of state.listeners) {
      try {
        listener(event);
      } catch (error) {
        logger.warn(`Codex runtime event listener failed: ${String(error)}`);
      }
    }
  }

  private findApprovalRecord(
    state: CodexRunSessionState,
    invocationId: string,
  ): CodexApprovalRecord | null {
    const direct = state.approvalRecords.get(invocationId);
    if (direct) {
      return direct;
    }
    const trimmed = invocationId.trim();
    if (!trimmed) {
      return null;
    }
    const baseId = trimmed.includes(":") ? trimmed.split(":")[0] ?? null : null;
    if (baseId) {
      return state.approvalRecords.get(baseId) ?? null;
    }
    return null;
  }

  private deleteApprovalRecord(state: CodexRunSessionState, record: CodexApprovalRecord): void {
    state.approvalRecords.delete(record.invocationId);
    state.approvalRecords.delete(record.itemId);
  }

  private requireSession(runId: string): CodexRunSessionState {
    const session = this.sessions.get(runId);
    if (!session) {
      throw new Error(`Codex runtime session '${runId}' is not available.`);
    }
    return session;
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
        // fallback below
      }
    }

    try {
      return appConfigProvider.config.getTempWorkspaceDir();
    } catch {
      return process.cwd();
    }
  }
}

let cachedCodexAppServerRuntimeService: CodexAppServerRuntimeService | null = null;

export const getCodexAppServerRuntimeService = (): CodexAppServerRuntimeService => {
  if (!cachedCodexAppServerRuntimeService) {
    cachedCodexAppServerRuntimeService = new CodexAppServerRuntimeService();
  }
  return cachedCodexAppServerRuntimeService;
};
