import fs from "node:fs";
import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import {
  asObject,
  asString,
  CLAUDE_AGENT_SDK_MODULE_NAME,
  MODEL_DISCOVERY_PROBE_PROMPT,
  type ClaudeSdkPermissionMode,
} from "../../../agent-execution/backends/claude/claude-runtime-shared.js";
import {
  CLAUDE_SEND_MESSAGE_MCP_TOOL_NAME,
  CLAUDE_SEND_MESSAGE_TOOL_NAME,
} from "../../../agent-execution/backends/claude/claude-send-message-tool-name.js";
import { buildClaudeSdkSpawnEnvironment } from "./claude-sdk-auth-environment.js";
import { resolveClaudeCodeExecutablePath } from "./claude-sdk-executable-path.js";
import {
  normalizeModelDescriptors,
  toModelInfo,
  type NormalizedModelDescriptor,
} from "./claude-sdk-model-normalizer.js";

const SEND_MESSAGE_TO_ALLOWED_TOOLS = [
  CLAUDE_SEND_MESSAGE_TOOL_NAME,
  CLAUDE_SEND_MESSAGE_MCP_TOOL_NAME,
] as const;

type ClaudePermissionDecision = { behavior: "allow" };

type ClaudeSdkFunctionName =
  | "query"
  | "getSessionMessages"
  | "createSdkMcpServer";

export type ClaudeSdkModuleLike = {
  query?: (...args: unknown[]) => unknown;
  getSessionMessages?: (...args: unknown[]) => unknown;
  createSdkMcpServer?: (...args: unknown[]) => unknown;
  default?: {
    query?: (...args: unknown[]) => unknown;
    getSessionMessages?: (...args: unknown[]) => unknown;
    createSdkMcpServer?: (...args: unknown[]) => unknown;
  };
};

export type ClaudeSdkCanUseToolOptions = {
  toolUseID?: string;
};

export type ClaudeSdkCanUseTool = (
  toolName: string,
  input: Record<string, unknown>,
  options: ClaudeSdkCanUseToolOptions,
) => Promise<Record<string, unknown>>;

export type ClaudeSdkQueryLike = AsyncIterable<unknown> & {
  interrupt: () => Promise<void>;
  close: () => void;
  setMcpServers?: (servers: Record<string, unknown>) => Promise<unknown>;
};

let sdkSessionSpawnQueue: Promise<void> = Promise.resolve();
let cachedClaudeSdkClient: ClaudeSdkClient | null = null;

const allowToolUseWithoutPrompt: ClaudeSdkCanUseTool = async (
  _toolName,
  input,
  options,
): Promise<ClaudePermissionDecision & { updatedInput: Record<string, unknown>; toolUseID?: string }> => ({
  behavior: "allow",
  updatedInput: input,
  ...(typeof options.toolUseID === "string" && options.toolUseID.length > 0
    ? { toolUseID: options.toolUseID }
    : {}),
});

const canScopeProcessCwd = (workingDirectory: string | null): workingDirectory is string => {
  const targetWorkingDirectory = workingDirectory?.trim();
  if (!targetWorkingDirectory) {
    return false;
  }

  try {
    return fs.statSync(targetWorkingDirectory).isDirectory();
  } catch {
    return false;
  }
};

const withGuardedProcessCwd = async <T>(
  workingDirectory: string | null,
  operation: () => Promise<T>,
): Promise<T> => {
  if (!canScopeProcessCwd(workingDirectory)) {
    return operation();
  }

  const originalWorkingDirectory = process.cwd();
  if (originalWorkingDirectory === workingDirectory) {
    return operation();
  }

  process.chdir(workingDirectory);
  try {
    return await operation();
  } finally {
    try {
      process.chdir(originalWorkingDirectory);
    } catch {
      // best-effort restoration to avoid masking the original failure
    }
  }
};

const runInClaudeSdkSessionSpawnCriticalSection = async <T>(
  operation: () => Promise<T>,
): Promise<T> => {
  const previous = sdkSessionSpawnQueue;
  let release!: () => void;
  sdkSessionSpawnQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await operation();
  } finally {
    release();
  }
};

const asClaudeSdkQuery = (value: unknown): ClaudeSdkQueryLike | null => {
  const payload = asObject(value);
  if (!payload) {
    return null;
  }
  const asyncIterableCandidate = value as { [Symbol.asyncIterator]?: unknown };
  if (typeof asyncIterableCandidate[Symbol.asyncIterator] !== "function") {
    return null;
  }
  if (typeof payload.close !== "function" || typeof payload.interrupt !== "function") {
    return null;
  }
  return payload as unknown as ClaudeSdkQueryLike;
};

const closeQueryControl = async (controlLike: Record<string, unknown> | null): Promise<void> => {
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
};

export class ClaudeSdkClient {
  private cachedSdkModule: ClaudeSdkModuleLike | null = null;

  setCachedModuleForTesting(module: unknown): void {
    this.cachedSdkModule = (module as ClaudeSdkModuleLike | null) ?? null;
  }

  async listModels(): Promise<ModelInfo[]> {
    const sdk = await this.loadModuleSafe();
    const supportedRows = await this.tryGetSupportedModelsFromQueryControl(
      sdk,
      buildClaudeSdkSpawnEnvironment(),
    );
    if (supportedRows.length > 0) {
      return supportedRows.map((row) => toModelInfo(row));
    }

    return [];
  }

  async getSessionMessages(sessionId: string): Promise<unknown | null> {
    const normalizedSessionId = asString(sessionId);
    if (!normalizedSessionId) {
      return null;
    }

    const sdk = await this.loadModuleSafe();
    const getSessionMessagesFn = this.resolveFunction(sdk, "getSessionMessages");
    if (!getSessionMessagesFn) {
      return null;
    }

    try {
      return await getSessionMessagesFn(normalizedSessionId);
    } catch {
      return null;
    }
  }

  async startQueryTurn(options: {
    prompt: string;
    sessionId?: string | null;
    model: string;
    workingDirectory: string | null;
    env?: Record<string, string | undefined>;
    mcpServers?: Record<string, unknown> | null;
    enableSendMessageToTooling: boolean;
    enableProjectSkillSettings?: boolean;
    permissionMode?: ClaudeSdkPermissionMode;
    autoExecuteTools?: boolean;
    canUseTool?: ClaudeSdkCanUseTool;
  }): Promise<ClaudeSdkQueryLike> {
    const sdk = await this.loadModuleSafe();
    const queryFn = this.resolveFunction(sdk, "query");
    if (!queryFn) {
      throw new Error("Claude SDK query API is unavailable.");
    }

    const queryOptions = this.buildQueryOptions(options);
    return this.createSdkQuery(options.workingDirectory, () =>
      queryFn({
        prompt: options.prompt,
        options: queryOptions,
      }),
    );
  }

  async interruptQuery(query: ClaudeSdkQueryLike | null): Promise<void> {
    if (!query) {
      return;
    }
    await query.interrupt();
  }

  closeQuery(query: ClaudeSdkQueryLike | null): void {
    if (!query) {
      return;
    }
    query.close();
  }

  async createToolDefinition(options: {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    handler: (args: unknown) => Promise<Record<string, unknown>>;
  }): Promise<Record<string, unknown>> {
    return {
      name: options.name,
      description: options.description,
      inputSchema: options.inputSchema,
      handler: options.handler,
    };
  }

  async createMcpServer(options: {
    name: string;
    tools: Record<string, unknown>[];
  }): Promise<Record<string, unknown> | null> {
    const sdk = await this.loadModuleSafe();
    const createSdkMcpServerFn = this.resolveFunction(sdk, "createSdkMcpServer");
    if (!createSdkMcpServerFn) {
      return null;
    }

    const normalizedTools = options.tools.map((tool, index) => {
      const payload = asObject(tool);
      const name = asString(payload?.name);
      if (!name) {
        throw new Error(
          `CLAUDE_MCP_TOOL_INVALID: Tool at index ${String(index)} is missing a valid name.`,
        );
      }
      const description = asString(payload?.description) ?? "";
      const inputSchema = asObject(payload?.inputSchema) ?? {};
      const handler =
        typeof payload?.handler === "function"
          ? (payload.handler as (args: unknown) => Promise<Record<string, unknown>>)
          : null;
      if (!handler) {
        throw new Error(
          `CLAUDE_MCP_TOOL_INVALID: Tool '${name}' is missing a valid handler.`,
        );
      }

      const annotations = asObject(payload?.annotations);
      return {
        name,
        description,
        inputSchema,
        handler,
        ...(annotations ? { annotations } : {}),
      };
    });

    const mcpServerConfig = await this.callSdkFunction(createSdkMcpServerFn, {
      name: options.name,
      tools: normalizedTools,
    });
    return asObject(mcpServerConfig);
  }

  private async loadModuleSafe(): Promise<ClaudeSdkModuleLike | null> {
    if (this.cachedSdkModule) {
      return this.cachedSdkModule;
    }

    try {
      const loaded = (await import(CLAUDE_AGENT_SDK_MODULE_NAME)) as ClaudeSdkModuleLike;
      this.cachedSdkModule = loaded;
      return loaded;
    } catch {
      return null;
    }
  }

  private resolveFunction(
    sdk: ClaudeSdkModuleLike | null,
    functionName: ClaudeSdkFunctionName,
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

  private buildQueryOptions(options: {
    prompt: string;
    sessionId?: string | null;
    model: string;
    workingDirectory: string | null;
    env?: Record<string, string | undefined>;
    mcpServers?: Record<string, unknown> | null;
    enableSendMessageToTooling: boolean;
    enableProjectSkillSettings?: boolean;
    permissionMode?: ClaudeSdkPermissionMode;
    autoExecuteTools?: boolean;
    canUseTool?: ClaudeSdkCanUseTool;
  }): Record<string, unknown> {
    const pathToClaudeCodeExecutable = resolveClaudeCodeExecutablePath();
    const sdkSpawnEnvironment = options.env ?? buildClaudeSdkSpawnEnvironment();
    const allowedTools = new Set<string>();
    if (options.enableSendMessageToTooling) {
      for (const toolName of SEND_MESSAGE_TO_ALLOWED_TOOLS) {
        allowedTools.add(toolName);
      }
    }
    if (options.enableProjectSkillSettings) {
      allowedTools.add("Skill");
    }
    return {
      model: options.model,
      pathToClaudeCodeExecutable,
      permissionMode: options.permissionMode ?? "default",
      ...(options.workingDirectory ? { cwd: options.workingDirectory } : {}),
      env: sdkSpawnEnvironment,
      ...(allowedTools.size > 0 ? { allowedTools: [...allowedTools] } : {}),
      ...(options.sessionId ? { resume: options.sessionId } : {}),
      ...(options.mcpServers ? { mcpServers: options.mcpServers } : {}),
      ...(options.enableProjectSkillSettings ? { settingSources: ["project"] } : {}),
      ...(options.canUseTool
        ? { canUseTool: options.canUseTool }
        : options.autoExecuteTools
          ? { canUseTool: allowToolUseWithoutPrompt }
          : {}),
    };
  }

  private async createSdkQuery(
    workingDirectory: string | null,
    operation: () => unknown,
  ): Promise<ClaudeSdkQueryLike> {
    const rawQuery = await runInClaudeSdkSessionSpawnCriticalSection(async () =>
      withGuardedProcessCwd(workingDirectory, async () => Promise.resolve(operation())),
    );
    const normalized = asClaudeSdkQuery(rawQuery);
    if (!normalized) {
      throw new Error("Claude SDK query object is invalid.");
    }
    return normalized;
  }

  private async callSdkFunction(
    fn: (...args: unknown[]) => unknown,
    ...args: unknown[]
  ): Promise<unknown> {
    return Promise.resolve(fn(...args));
  }

  private async tryGetSupportedModelsFromQueryControl(
    sdk: ClaudeSdkModuleLike | null,
    env?: Record<string, string | undefined>,
  ): Promise<NormalizedModelDescriptor[]> {
    const queryFn = this.resolveFunction(sdk, "query");
    if (!queryFn) {
      return [];
    }

    const pathToClaudeCodeExecutable = resolveClaudeCodeExecutablePath();

    let controlLike: Record<string, unknown> | null = null;
    try {
      const result = await queryFn({
        prompt: MODEL_DISCOVERY_PROBE_PROMPT,
        options: {
          maxTurns: 0,
          permissionMode: "plan",
          cwd: process.cwd(),
          pathToClaudeCodeExecutable,
          ...(env ? { env } : {}),
        },
      });

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

      return [];
    } catch {
      return [];
    } finally {
      await closeQueryControl(controlLike);
    }
  }
}

export const getClaudeSdkClient = (): ClaudeSdkClient => {
  if (!cachedClaudeSdkClient) {
    cachedClaudeSdkClient = new ClaudeSdkClient();
  }
  return cachedClaudeSdkClient;
};
