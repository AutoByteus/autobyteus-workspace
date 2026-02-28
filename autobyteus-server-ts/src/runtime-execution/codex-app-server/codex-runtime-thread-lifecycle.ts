import type { CodexAppServerClient } from "./codex-app-server-client.js";
import type { JsonObject } from "./codex-runtime-json.js";
import {
  normalizeApprovalPolicy,
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
  dynamicTools: JsonObject[] | null,
  developerInstructions: string | null,
): Promise<string | null> => {
  const response = await client.request<unknown>("thread/start", {
    model,
    modelProvider: null,
    cwd,
    approvalPolicy: normalizeApprovalPolicy(),
    sandbox: normalizeSandboxMode(),
    config: null,
    baseInstructions: null,
    developerInstructions,
    personality: null,
    ephemeral: false,
    dynamicTools,
    experimentalRawEvents: false,
    persistExtendedHistory: false,
  });
  return resolveThreadId(response);
};

export const resumeCodexThread = async (
  client: CodexAppServerClient,
  threadId: string,
  cwd: string,
  model: string | null,
  dynamicTools: JsonObject[] | null,
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
      approvalPolicy: normalizeApprovalPolicy(),
      sandbox: normalizeSandboxMode(),
      config: null,
      baseInstructions: null,
      developerInstructions,
      personality: null,
      dynamicTools,
      persistExtendedHistory: false,
    });
    return resolveThreadId(response);
  } catch (error) {
    logger.warn(`Failed to resume Codex thread '${threadId}', starting a new thread: ${String(error)}`);
    return startCodexThread(client, cwd, model, dynamicTools, developerInstructions);
  }
};
