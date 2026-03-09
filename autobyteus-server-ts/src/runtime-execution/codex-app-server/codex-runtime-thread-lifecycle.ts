import type { CodexAppServerClient } from "./codex-app-server-client.js";
import type { JsonObject } from "./codex-runtime-json.js";
import {
  normalizeSandboxMode,
  resolveThreadId,
} from "./codex-runtime-launch-config.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export const startCodexThread = async (
  client: CodexAppServerClient,
  cwd: string,
  model: string | null,
  approvalPolicy: string,
  dynamicTools: JsonObject[] | null,
  baseInstructions: string | null,
  developerInstructions: string | null,
): Promise<string | null> => {
  const response = await client.request<unknown>("thread/start", {
    model,
    modelProvider: null,
    cwd,
    approvalPolicy,
    sandbox: normalizeSandboxMode(),
    config: null,
    baseInstructions,
    developerInstructions,
    personality: null,
    ephemeral: false,
    dynamicTools,
    experimentalRawEvents: true,
    persistExtendedHistory: true,
  });
  return resolveThreadId(response);
};

export const resumeCodexThread = async (
  client: CodexAppServerClient,
  threadId: string,
  cwd: string,
  model: string | null,
  approvalPolicy: string,
  dynamicTools: JsonObject[] | null,
  baseInstructions: string | null,
  developerInstructions: string | null,
): Promise<string | null> => {
  try {
    const response = await client.request<unknown>("thread/resume", {
      threadId,
      history: null,
      path: null,
      model,
      modelProvider: null,
      cwd,
      approvalPolicy,
      sandbox: normalizeSandboxMode(),
      config: null,
      baseInstructions,
      developerInstructions,
      personality: null,
      dynamicTools,
      experimentalRawEvents: true,
      persistExtendedHistory: true,
    });
    return resolveThreadId(response);
  } catch (error) {
    logger.warn(`Failed to resume Codex thread '${threadId}', starting a new thread: ${String(error)}`);
    return startCodexThread(
      client,
      cwd,
      model,
      approvalPolicy,
      dynamicTools,
      baseInstructions,
      developerInstructions,
    );
  }
};
