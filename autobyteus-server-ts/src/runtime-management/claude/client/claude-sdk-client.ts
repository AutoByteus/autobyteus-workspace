import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { beginClaudeSdkSessionOpening, type ClaudeSdkSessionOpening } from "./claude-sdk-session-opening.js";
import type { SecretValue } from "autobyteus-ts";
import type { ModelInfoWithSelectionPresentation } from "../../../llm-management/domain/model-selection-presentation.js";
import {
  asString,
  CLAUDE_AGENT_SDK_MODULE_NAME,
  logger,
  type ClaudeSdkPermissionMode,
} from "../../../agent-execution/backends/claude/claude-runtime-shared.js";
import { getSecretVaultRuntime } from "../../../secret-management/secret-vault-runtime.js";
import {
  buildClaudeSdkSpawnEnvironment,
  resolveClaudeSdkAuthMode,
} from "./claude-sdk-spawn-environment.js";
import { resolveClaudeCodeExecutablePath } from "./claude-sdk-executable-path.js";
import { normalizeModelDescriptors, toModelInfo } from "./claude-sdk-model-normalizer.js";
import { deriveClaudeModelSelectionPresentation } from "./claude-sdk-model-selection-presentation.js";
import { getClaudeRuntimeSettingSources, type ClaudeSdkSettingSource } from "./claude-sdk-setting-sources.js";
import { withClaudeControlQuery } from "./claude-sdk-control-query.js";
import { isDeadlineExceeded, type ReadDeadline } from "../../read-deadline.js";
import type { ClaudeSdkSessionBinding } from "./claude-sdk-session-binding.js";
import {
  ClaudeSdkInputChannel,
} from "./claude-sdk-streaming-session.js";

type ClaudeSdkFunctionName =
  | "query"
  | "getSessionMessages";

export type ClaudeSdkModuleLike = {
  query?: (...args: unknown[]) => unknown;
  getSessionMessages?: (...args: unknown[]) => unknown;
  default?: {
    query?: (...args: unknown[]) => unknown;
    getSessionMessages?: (...args: unknown[]) => unknown;
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

export type ClaudeSdkStderrCallback = (data: string) => void;
type ClaudeApiKeyResolver = () => Promise<SecretValue>;

/** Options for one long-lived streaming-input session (one Claude CLI process). */
export type ClaudeSdkStreamingSessionOptions = {
  systemPrompt: string;
  sessionBinding: ClaudeSdkSessionBinding;
  model: string;
  workingDirectory: string | null;
  env?: Record<string, string | undefined>;
  mcpServers?: Record<string, unknown> | null;
  allowedTools?: Iterable<string> | null;
  permissionMode?: ClaudeSdkPermissionMode;
  canUseTool?: ClaudeSdkCanUseTool;
  stderr?: ClaudeSdkStderrCallback;
  thinking?: Readonly<{ type: "adaptive" | "disabled" }>;
  debugFile?: string;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  /** The settings sources to load; the runtime's (`user`, `project`, `local`) when absent. */
  settingSources?: readonly ClaudeSdkSettingSource[];
  /** Tools removed from the session besides AutoByteus's own list. */
  extraDisallowedTools?: readonly string[];
  /** Programmatic SDK hooks (`hooks` of the SDK options). */
  hooks?: Readonly<Record<string, unknown>>;
};

export type ClaudeSdkQueryLike = AsyncIterable<unknown> & {
  interrupt: () => Promise<unknown>;
  close: () => void;
  initializationResult: () => Promise<unknown>;
  supportedModels?: () => Promise<unknown>;
  setMcpServers?: (servers: Record<string, unknown>) => Promise<unknown>;
  getContextUsage?: (options: { detail: "summary" | "full" }) => Promise<unknown>;
};

let sdkSessionSpawnQueue: Promise<void> = Promise.resolve();
let cachedClaudeSdkClient: ClaudeSdkClient | null = null;

// Claude Code built-ins exposed to normal turns (SDK `tools`); all others, incl. native
// multi-agent tools, stay out of context. MCP tools are unaffected. Re-verify on SDK upgrades.
const CLAUDE_BUILT_IN_TOOLS_ENABLED_BY_AUTOBYTEUS = [
  "Bash", "Read", "Edit", "Write", "Glob", "Grep", "NotebookEdit", "WebFetch", "WebSearch", "Skill",
] as const;
// Safety net even if the enabled list widens; AutoByteus delegate_task/send_message_to replace these.
const CLAUDE_BUILT_IN_TOOLS_DISALLOWED_BY_AUTOBYTEUS = [
  "AskUserQuestion", "Agent", "Task", "Workflow", "SendMessage", "ListAgents",
] as const;
const CLAUDE_API_KEY_UNAVAILABLE = "CLAUDE_RUNTIME_API_KEY_UNAVAILABLE";

const resolveClaudeApiKeyFromVault: ClaudeApiKeyResolver = () =>
  getSecretVaultRuntime().requireService().resolveForUse({
    kind: "agentRuntime",
    runtimeKind: "claude_agent_sdk",
    credentialSlot: "apiKey",
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

export class ClaudeSdkClient {
  private cachedSdkModule: ClaudeSdkModuleLike | null = null;

  constructor(
    private readonly resolveClaudeApiKey: ClaudeApiKeyResolver = resolveClaudeApiKeyFromVault,
  ) {}

  setCachedModuleForTesting(module: unknown): void {
    this.cachedSdkModule = (module as ClaudeSdkModuleLike | null) ?? null;
  }

  /**
   * The CLI's offered models, read on a control query that sends no message (C-15). `deadline`: the read's end time
   * (the available-agent-runtimes read); without it, unbounded as before. Any failure gives an empty list, except the
   * deadline's own time-out, which reaches the caller so the read can say "timed out" (CR-002).
   */
  async listModels(options: Readonly<{ deadline?: ReadDeadline }> = {}): Promise<ModelInfoWithSelectionPresentation[]> {
    const queryFn = this.resolveFunction(await this.loadModuleSafe(), "query");
    if (!queryFn) return [];
    let spawnEnvironment: Record<string, string | undefined>;
    try {
      spawnEnvironment = await this.resolveSpawnEnvironment();
    } catch {
      return [];
    }
    let supportedRows: ReturnType<typeof normalizeModelDescriptors> = [];
    try {
      supportedRows = await withClaudeControlQuery({ queryFn, env: spawnEnvironment, deadline: options.deadline }, async (control) =>
        typeof control.supportedModels === "function"
          ? normalizeModelDescriptors(await (control.supportedModels as () => Promise<unknown>).call(control))
          : []);
    } catch (error) {
      if (options.deadline && isDeadlineExceeded(error)) throw error;
      return [];
    }
    const selectionPresentation = deriveClaudeModelSelectionPresentation(supportedRows);
    return supportedRows.map((row) => ({
      ...toModelInfo(row),
      selection_presentation: selectionPresentation.get(row.identifier) ?? null,
    }));
  }

  /**
   * The account's usage answer (the SDK's experimental `get_usage` control request), read on a control query that
   * sends no message, so it spends no tokens. Throws when it cannot be read; the caller keeps only what it needs.
   */
  async readUsage(options: Readonly<{ deadline: ReadDeadline }>): Promise<unknown> {
    const queryFn = this.resolveFunction(await this.loadModuleSafe(), "query");
    if (!queryFn) throw new Error("Claude SDK query API is unavailable.");
    const env = await this.resolveSpawnEnvironment();
    return withClaudeControlQuery({ queryFn, env, deadline: options.deadline }, async (control) => {
      const usage = control.usage_EXPERIMENTAL_MAY_CHANGE_DO_NOT_RELY_ON_THIS_API_YET;
      if (typeof usage !== "function") throw new Error("Claude SDK usage request is unavailable.");
      return (usage as (opts: { skipBehaviors: boolean }) => Promise<unknown>).call(control, { skipBehaviors: true });
    });
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

  beginStreamingSession(input: { resolveOptions(): ClaudeSdkStreamingSessionOptions | Promise<ClaudeSdkStreamingSessionOptions> }): ClaudeSdkSessionOpening {
    let suppliedOptions: ClaudeSdkStreamingSessionOptions | null = null;
    return beginClaudeSdkSessionOpening({
      stderr: text => suppliedOptions?.stderr?.(text),
      createQuery: async control => {
        const options = await input.resolveOptions();
        suppliedOptions = options;
        control.assertAccepting();
        const sdk = await this.loadModuleSafe();
        control.assertAccepting();
        const queryFn = this.resolveFunction(sdk, "query");
        if (!queryFn) throw new Error("Claude SDK query API is unavailable.");
        const spawnEnvironment = await this.resolveSpawnEnvironment(options.env);
        control.assertAccepting();
        if (asString(spawnEnvironment.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS)) logger.warn("Claude CLI background tasks disabled by inherited CLAUDE_CODE_DISABLE_BACKGROUND_TASKS operator environment.");
        const queryOptions = this.buildQueryOptions(options, spawnEnvironment);
        if (!options.debugFile && /^(1|true)$/i.test(spawnEnvironment.DEBUG_CLAUDE_AGENT_SDK ?? "")) {
          const root = spawnEnvironment.CLAUDE_CONFIG_DIR || path.join(spawnEnvironment.HOME || os.homedir(), ".claude");
          const directory = path.join(root, "debug");
          await fs.promises.mkdir(directory, { recursive: true });
          control.assertAccepting();
          queryOptions.debugFile = path.join(directory, `autobyteus-cli-${randomUUID()}.log`);
          logger.info("Claude CLI debug log:", queryOptions.debugFile);
        }
        const originalPermission = options.canUseTool;
        if (originalPermission) queryOptions.canUseTool = async (...args: Parameters<ClaudeSdkCanUseTool>) => {
          control.assertAccepting();
          const response = await originalPermission(...args);
          control.assertAccepting();
          return response;
        };
        queryOptions.spawnClaudeCodeProcess = control.spawn;
        queryOptions.stderr = control.stderr;
        await runInClaudeSdkSessionSpawnCriticalSection(async () => {
          control.assertAccepting();
          return withGuardedProcessCwd(options.workingDirectory, async () => {
            control.assertAccepting();
            const raw = queryFn({ prompt: control.channel, options: queryOptions });
            control.registerQuery(raw); // before shape checks/any additional await
          });
        });
      },
    });
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

  private buildQueryOptions(
    options: ClaudeSdkStreamingSessionOptions,
    spawnEnvironment: Record<string, string | undefined>,
  ): Record<string, unknown> {
    const pathToClaudeCodeExecutable = resolveClaudeCodeExecutablePath();
    const settingSources = options.settingSources ? [...options.settingSources] : getClaudeRuntimeSettingSources();
    const allowedTools = new Set<string>();
    for (const toolName of options.allowedTools ?? []) {
      const normalizedToolName = asString(toolName)?.trim();
      if (!normalizedToolName) {
        continue;
      }
      allowedTools.add(normalizedToolName);
    }
    return {
      model: options.model,
      ...(options.debugFile ? { debugFile: options.debugFile } : {}),
      ...(options.systemPrompt ? { systemPrompt: options.systemPrompt } : {}),
      pathToClaudeCodeExecutable,
      permissionMode: options.permissionMode ?? "default",
      ...(options.workingDirectory ? { cwd: options.workingDirectory } : {}),
      env: spawnEnvironment,
      tools: [...CLAUDE_BUILT_IN_TOOLS_ENABLED_BY_AUTOBYTEUS],
      disallowedTools: [...CLAUDE_BUILT_IN_TOOLS_DISALLOWED_BY_AUTOBYTEUS, ...(options.extraDisallowedTools ?? [])],
      ...(options.hooks ? { hooks: options.hooks } : {}),
      ...(allowedTools.size > 0 ? { allowedTools: [...allowedTools] } : {}),
      ...(options.sessionBinding.kind === "create"
        ? { sessionId: options.sessionBinding.sessionId }
        : { resume: options.sessionBinding.sessionId }),
      ...(options.mcpServers ? { mcpServers: options.mcpServers } : {}),
      ...(options.stderr ? { stderr: options.stderr } : {}),
      settingSources,
      // Per-call usage arrives only on `message_delta` stream events (token-meter-accuracy D-2).
      includePartialMessages: true,
      ...(options.thinking ? { thinking: options.thinking } : {}),
      ...(options.effort ? { effort: options.effort } : {}),
      ...(options.canUseTool ? { canUseTool: options.canUseTool } : {}),
    };
  }

  private async resolveSpawnEnvironment(
    explicitEnvironment?: Record<string, string | undefined>,
  ): Promise<Record<string, string | undefined>> {
    const effectiveEnvironment = explicitEnvironment ?? process.env;
    if (resolveClaudeSdkAuthMode(effectiveEnvironment) !== "api-key") {
      return explicitEnvironment ?? buildClaudeSdkSpawnEnvironment(effectiveEnvironment);
    }

    try {
      const apiKey = await this.resolveClaudeApiKey();
      return buildClaudeSdkSpawnEnvironment(
        effectiveEnvironment,
        apiKey.revealToTrustedConsumer(),
      );
    } catch {
      throw new Error(CLAUDE_API_KEY_UNAVAILABLE);
    }
  }
}

export const getClaudeSdkClient = (): ClaudeSdkClient => {
  if (!cachedClaudeSdkClient) {
    cachedClaudeSdkClient = new ClaudeSdkClient();
  }
  return cachedClaudeSdkClient;
};
