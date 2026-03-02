import {
  asObject,
  type ClaudeSdkModuleLike,
} from "./claude-runtime-shared.js";
import { resolveSdkFunction, tryCallWithVariants } from "./claude-runtime-sdk-interop.js";

const SEND_MESSAGE_TO_ALLOWED_TOOLS = [
  "send_message_to",
  "mcp__autobyteus_team__send_message_to",
] as const;

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
  resumeSessionId: string | null;
  enableSendMessageToTooling: boolean;
}): Promise<ClaudeV2SessionLike> => {
  const createFn = resolveSdkFunction(options.sdk, "unstable_v2_createSession");
  const resumeFn = resolveSdkFunction(options.sdk, "unstable_v2_resumeSession");
  if (!createFn || !resumeFn) {
    throw new Error("Claude SDK V2 session APIs are unavailable.");
  }

  const sessionOptions: Record<string, unknown> = {
    model: options.model,
    pathToClaudeCodeExecutable: options.pathToClaudeCodeExecutable,
    permissionMode: "default",
    ...(options.enableSendMessageToTooling
      ? { allowedTools: [...SEND_MESSAGE_TO_ALLOWED_TOOLS] }
      : {}),
  };

  const rawSession = options.resumeSessionId
    ? await tryCallWithVariants(resumeFn, [[options.resumeSessionId, sessionOptions]])
    : await tryCallWithVariants(createFn, [[sessionOptions]]);
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
