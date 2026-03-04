import { spawnSync } from "node:child_process";

export const CLAUDE_AGENT_SDK_MODULE_NAME = "@anthropic-ai/claude-agent-sdk";
export const MODEL_DISCOVERY_PROBE_PROMPT = "Enumerate supported models only.";

const CLAUDE_AGENT_SDK_AUTH_MODE_ENV_KEY = "CLAUDE_AGENT_SDK_AUTH_MODE";
const CLAUDE_OAUTH_TOKEN_ENV_KEYS = [
  "CLAUDE_CODE_OAUTH_TOKEN",
  "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR",
] as const;
const CLAUDE_API_KEY_ENV_KEYS = [
  "ANTHROPIC_API_KEY",
  "CLAUDE_CODE_API_KEY",
  "CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR",
] as const;

export type ClaudeSdkAuthMode = "auto" | "cli" | "api-key";

export type ClaudeSdkModuleLike = {
  query?: (...args: unknown[]) => unknown;
  getSessionMessages?: (...args: unknown[]) => unknown;
  listModels?: (...args: unknown[]) => unknown;
  createSdkMcpServer?: (...args: unknown[]) => unknown;
  tool?: (...args: unknown[]) => unknown;
  unstable_v2_createSession?: (...args: unknown[]) => unknown;
  unstable_v2_resumeSession?: (...args: unknown[]) => unknown;
  default?: {
    query?: (...args: unknown[]) => unknown;
    getSessionMessages?: (...args: unknown[]) => unknown;
    listModels?: (...args: unknown[]) => unknown;
    createSdkMcpServer?: (...args: unknown[]) => unknown;
    tool?: (...args: unknown[]) => unknown;
    unstable_v2_createSession?: (...args: unknown[]) => unknown;
    unstable_v2_resumeSession?: (...args: unknown[]) => unknown;
  };
};

export interface ClaudeRuntimeEvent {
  method: string;
  params?: Record<string, unknown>;
}

export interface ClaudeInterAgentRelayRequest {
  senderRunId: string;
  senderMemberName?: string | null;
  senderTeamRunId?: string | null;
  toolArguments: Record<string, unknown>;
}

export interface ClaudeInterAgentRelayResult {
  accepted: boolean;
  code?: string;
  message?: string;
}

export type ClaudeInterAgentRelayHandler = (
  request: ClaudeInterAgentRelayRequest,
) => Promise<ClaudeInterAgentRelayResult>;

export type TeamManifestMetadataMember = {
  memberName: string;
  role: string | null;
  description: string | null;
};

export interface ClaudeSessionRuntimeOptions {
  modelIdentifier: string;
  workingDirectory: string;
  autoExecuteTools?: boolean;
  llmConfig?: Record<string, unknown> | null;
  runtimeMetadata?: Record<string, unknown> | null;
}

const CLAUDE_EXECUTABLE_METADATA_KEYS = [
  "pathToClaudeCodeExecutable",
  "claudeCodeExecutablePath",
  "claude_code_executable_path",
] as const;

const CLAUDE_EXECUTABLE_LLM_CONFIG_KEYS = [
  "pathToClaudeCodeExecutable",
  "claudeCodeExecutablePath",
  "claude_code_executable_path",
] as const;

const CLAUDE_EXECUTABLE_ENV_KEYS = [
  "CLAUDE_CODE_EXECUTABLE_PATH",
  "CLAUDE_CODE_PATH",
  "CLAUDE_CLI_PATH",
] as const;

let cachedDiscoveredClaudeExecutablePath: string | null | undefined = undefined;
const cachedClaudeExecutableProbeByCandidate = new Map<string, boolean>();
const warnedInvalidClaudeExecutableCandidates = new Set<string>();

export interface ClaudeRunSessionState {
  runId: string;
  sessionId: string;
  model: string;
  workingDirectory: string;
  autoExecuteTools: boolean;
  hasCompletedTurn: boolean;
  runtimeMetadata: Record<string, unknown>;
  teamRunId: string | null;
  memberName: string | null;
  sendMessageToEnabled: boolean;
  teamManifestMembers: TeamManifestMetadataMember[];
  allowedRecipientNames: string[];
  listeners: Set<(event: ClaudeRuntimeEvent) => void>;
  activeAbortController: AbortController | null;
  activeTurnId: string | null;
}

export const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export const asNonEmptyRawString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

export const resolveClaudeSdkAuthMode = (
  env: NodeJS.ProcessEnv = process.env,
): ClaudeSdkAuthMode => {
  const rawMode = asString(env[CLAUDE_AGENT_SDK_AUTH_MODE_ENV_KEY])?.toLowerCase();
  if (rawMode === "auto" || rawMode === "cli" || rawMode === "api-key") {
    return rawMode;
  }

  // Claude Agent SDK runtime should prefer Claude CLI auth by default.
  return "cli";
};

export const buildClaudeSdkSpawnEnvironment = (
  env: NodeJS.ProcessEnv = process.env,
): Record<string, string | undefined> => {
  const resolvedMode = resolveClaudeSdkAuthMode(env);
  const resolvedEnv: Record<string, string | undefined> = { ...env };

  if (resolvedMode === "api-key") {
    return resolvedEnv;
  }

  const hasOauthSignal = CLAUDE_OAUTH_TOKEN_ENV_KEYS.some(
    (key) => Boolean(asNonEmptyRawString(resolvedEnv[key])),
  );
  const shouldPreferCliAuth = resolvedMode === "cli" || (resolvedMode === "auto" && hasOauthSignal);
  if (!shouldPreferCliAuth) {
    return resolvedEnv;
  }

  for (const key of CLAUDE_API_KEY_ENV_KEYS) {
    delete resolvedEnv[key];
  }
  return resolvedEnv;
};

export const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

export const nowTimestampSeconds = (): number => Math.floor(Date.now() / 1000);

export const toLowerTrimmed = (value: string): string => value.trim().toLowerCase();

const discoverExecutablePath = (binaryName: string): string | null => {
  const command = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(command, [binaryName], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (result.status !== 0) {
    return null;
  }

  const line = result.stdout
    .split(/\r?\n/u)
    .map((row) => row.trim())
    .find((row) => row.length > 0);
  return line ?? null;
};

const isUsableClaudeExecutablePath = (candidate: string): boolean => {
  const cached = cachedClaudeExecutableProbeByCandidate.get(candidate);
  if (cached !== undefined) {
    return cached;
  }

  let isUsable = false;
  try {
    const result = spawnSync(candidate, ["--version"], {
      stdio: "ignore",
      timeout: 3_000,
    });
    isUsable = result.status === 0;
  } catch {
    isUsable = false;
  }

  cachedClaudeExecutableProbeByCandidate.set(candidate, isUsable);
  return isUsable;
};

const resolveUsableClaudeExecutableCandidate = (candidate: string | null): string | null => {
  if (!candidate) {
    return null;
  }
  if (isUsableClaudeExecutablePath(candidate)) {
    return candidate;
  }
  if (!warnedInvalidClaudeExecutableCandidates.has(candidate)) {
    warnedInvalidClaudeExecutableCandidates.add(candidate);
    logger.warn(
      `Ignoring unusable Claude executable path '${candidate}'. Falling back to auto-discovery/default.`,
    );
  }
  return null;
};

const resolveDefaultClaudeExecutablePath = (): string => {
  if (cachedDiscoveredClaudeExecutablePath === undefined) {
    cachedDiscoveredClaudeExecutablePath = discoverExecutablePath("claude");
  }
  const discovered = resolveUsableClaudeExecutableCandidate(cachedDiscoveredClaudeExecutablePath);
  if (discovered) {
    return discovered;
  }
  return "claude";
};

export const resolveClaudeCodeExecutablePath = (options?: {
  runtimeMetadata?: Record<string, unknown> | null;
  llmConfig?: Record<string, unknown> | null;
}): string => {
  for (const key of CLAUDE_EXECUTABLE_METADATA_KEYS) {
    const value = resolveUsableClaudeExecutableCandidate(asString(options?.runtimeMetadata?.[key]));
    if (value) {
      return value;
    }
  }

  for (const key of CLAUDE_EXECUTABLE_LLM_CONFIG_KEYS) {
    const value = resolveUsableClaudeExecutableCandidate(asString(options?.llmConfig?.[key]));
    if (value) {
      return value;
    }
  }

  for (const key of CLAUDE_EXECUTABLE_ENV_KEYS) {
    const value = resolveUsableClaudeExecutableCandidate(asString(process.env[key]));
    if (value) {
      return value;
    }
  }

  return resolveDefaultClaudeExecutablePath();
};

export const asAsyncIterable = (value: unknown): AsyncIterable<unknown> | null => {
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
