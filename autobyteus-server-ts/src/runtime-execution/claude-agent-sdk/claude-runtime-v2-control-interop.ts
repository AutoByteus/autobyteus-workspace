import fs from "node:fs";
import {
  asObject,
  asString,
  type ClaudeSdkPermissionMode,
  type ClaudeSdkModuleLike,
} from "./claude-runtime-shared.js";
import { resolveSdkFunction, tryCallWithVariants } from "./claude-runtime-sdk-interop.js";

const SEND_MESSAGE_TO_ALLOWED_TOOLS = [
  "send_message_to",
  "mcp__autobyteus_team__send_message_to",
] as const;

type ClaudePermissionDecision = { behavior: "allow" };

type ClaudeCanUseToolOptions = {
  toolUseID?: string;
};

type ClaudeCanUseTool = (
  toolName: string,
  input: Record<string, unknown>,
  options: ClaudeCanUseToolOptions,
) => Promise<Record<string, unknown>>;

const allowToolUseWithoutPrompt: ClaudeCanUseTool = async (
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

export type ClaudeV2SessionLike = {
  send: (message: string | Record<string, unknown>) => Promise<void>;
  stream: () => AsyncIterable<unknown>;
  close: () => void;
  sessionId?: string;
  query?: Record<string, unknown>;
};

export type ClaudeV2SessionControlLike = {
  setMcpServers?: (servers: Record<string, unknown>) => Promise<unknown>;
  interrupt?: () => Promise<unknown>;
  close?: () => void;
};

let v2SessionSpawnQueue: Promise<void> = Promise.resolve();

const runInV2SessionSpawnCriticalSection = async <T>(
  operation: () => Promise<T>,
): Promise<T> => {
  const previous = v2SessionSpawnQueue;
  let release!: () => void;
  v2SessionSpawnQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await operation();
  } finally {
    release();
  }
};

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

const asClaudeV2Session = (value: unknown): ClaudeV2SessionLike | null => {
  const payload = asObject(value);
  if (!payload) {
    return null;
  }
  if (typeof payload.send !== "function" || typeof payload.stream !== "function") {
    return null;
  }
  if (typeof payload.close !== "function") {
    return null;
  }
  return payload as unknown as ClaudeV2SessionLike;
};

export const createOrResumeClaudeV2Session = async (options: {
  sdk: ClaudeSdkModuleLike | null;
  model: string;
  pathToClaudeCodeExecutable: string;
  workingDirectory: string | null;
  env?: Record<string, string | undefined>;
  resumeSessionId: string | null;
  enableSendMessageToTooling: boolean;
  permissionMode?: ClaudeSdkPermissionMode;
  autoExecuteTools?: boolean;
  canUseTool?: ClaudeCanUseTool;
}): Promise<ClaudeV2SessionLike> => {
  const createFn = resolveSdkFunction(options.sdk, "unstable_v2_createSession");
  const resumeFn = resolveSdkFunction(options.sdk, "unstable_v2_resumeSession");
  if (!createFn || !resumeFn) {
    throw new Error("Claude SDK V2 session APIs are unavailable.");
  }

  const sessionOptions: Record<string, unknown> = {
    model: options.model,
    pathToClaudeCodeExecutable: options.pathToClaudeCodeExecutable,
    permissionMode: options.permissionMode ?? "default",
    ...(options.workingDirectory ? { cwd: options.workingDirectory } : {}),
    ...(options.env ? { env: options.env } : {}),
    ...(options.enableSendMessageToTooling
      ? { allowedTools: [...SEND_MESSAGE_TO_ALLOWED_TOOLS] }
      : {}),
    ...(options.canUseTool
      ? { canUseTool: options.canUseTool }
      : options.autoExecuteTools
        ? { canUseTool: allowToolUseWithoutPrompt }
        : {}),
  };

  const rawSession = await runInV2SessionSpawnCriticalSection(async () =>
    withGuardedProcessCwd(options.workingDirectory, async () =>
      options.resumeSessionId
        ? tryCallWithVariants(resumeFn, [[options.resumeSessionId, sessionOptions]])
        : tryCallWithVariants(createFn, [[sessionOptions]]),
    ),
  );
  const normalized = asClaudeV2Session(rawSession);
  if (!normalized) {
    throw new Error("Claude SDK V2 session object is invalid.");
  }
  return normalized;
};

export const resolveClaudeV2SessionControl = (
  session: ClaudeV2SessionLike,
): ClaudeV2SessionControlLike | null => {
  const control = asObject((session as { query?: unknown }).query);
  if (!control) {
    return null;
  }
  return control as ClaudeV2SessionControlLike;
};

const resolveSessionIdFromObject = (value: unknown): string | null => {
  const payload = asObject(value);
  if (!payload) {
    return null;
  }
  const safeRead = (key: string): unknown => {
    try {
      return (payload as Record<string, unknown>)[key];
    } catch {
      return undefined;
    }
  };
  return (
    asString(safeRead("sessionId")) ??
    asString(safeRead("session_id")) ??
    asString(safeRead("threadId")) ??
    asString(safeRead("thread_id")) ??
    asString(safeRead("id")) ??
    null
  );
};

export const resolveClaudeV2SessionId = (
  session: ClaudeV2SessionLike,
): string | null => {
  return (
    resolveSessionIdFromObject(session) ??
    resolveSessionIdFromObject((session as { query?: unknown }).query) ??
    null
  );
};

const requireControlMethod = <T extends keyof ClaudeV2SessionControlLike>(
  control: ClaudeV2SessionControlLike | null,
  method: T,
): { owner: ClaudeV2SessionControlLike; fn: NonNullable<ClaudeV2SessionControlLike[T]> } => {
  if (!control || typeof control[method] !== "function") {
    throw new Error(
      `CLAUDE_V2_CONTROL_UNAVAILABLE: Required control method '${String(method)}' is unavailable.`,
    );
  }
  return {
    owner: control,
    fn: control[method] as NonNullable<ClaudeV2SessionControlLike[T]>,
  };
};

export const configureClaudeV2DynamicMcpServers = async (options: {
  control: ClaudeV2SessionControlLike | null;
  servers: Record<string, unknown>;
}): Promise<void> => {
  const setMcpServers = requireControlMethod(options.control, "setMcpServers");
  await setMcpServers.fn.call(setMcpServers.owner, options.servers);
};

export const interruptClaudeV2SessionTurn = async (
  control: ClaudeV2SessionControlLike | null,
): Promise<void> => {
  if (!control || typeof control.interrupt !== "function") {
    return;
  }
  await control.interrupt();
};
