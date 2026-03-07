import type { CodexAppServerClient } from "./codex-app-server-client.js";
import {
  getCodexAppServerProcessManager,
  type CodexAppServerProcessManager,
} from "./codex-app-server-process-manager.js";
import {
  resolveApprovalPolicyForAutoExecuteTools,
  normalizeSandboxMode,
} from "./codex-runtime-launch-config.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const THREAD_READ_RETRY_DELAY_MS = 250;
const THREAD_READ_MAX_ATTEMPTS = 4;

const isThreadNotLoadedError = (message: string): boolean =>
  message.toLowerCase().includes("thread not loaded");

const isThreadNotMaterializedError = (message: string): boolean =>
  message.toLowerCase().includes("not materialized yet");

const isTransientThreadReadError = (message: string): boolean =>
  isThreadNotLoadedError(message) || isThreadNotMaterializedError(message);

const delay = async (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export class CodexThreadHistoryReader {
  private readonly processManager: CodexAppServerProcessManager;

  constructor(
    processManager: CodexAppServerProcessManager = getCodexAppServerProcessManager(),
  ) {
    this.processManager = processManager;
  }

  async readThread(
    threadId: string,
    cwd: string,
  ): Promise<Record<string, unknown> | null> {
    const normalizedThreadId = asString(threadId);
    if (!normalizedThreadId) {
      return null;
    }

    const client = await this.processManager.getClient(cwd);

    try {
      for (let attempt = 1; attempt <= THREAD_READ_MAX_ATTEMPTS; attempt += 1) {
        try {
          const response = await client.request<unknown>("thread/read", {
            threadId: normalizedThreadId,
            includeTurns: true,
          });
          return asObject(response);
        } catch (error) {
          const message = String(error);
          if (!isTransientThreadReadError(message)) {
            throw error;
          }

          if (isThreadNotLoadedError(message)) {
            await this.resumeThread(client, normalizedThreadId, cwd);
          }

          if (attempt >= THREAD_READ_MAX_ATTEMPTS) {
            throw error;
          }

          await delay(THREAD_READ_RETRY_DELAY_MS * attempt);
        }
      }

      return null;
    } catch (error) {
      logger.warn(
        `Failed to read Codex thread '${normalizedThreadId}': ${String(error)}`,
      );
      return null;
    }
  }

  private async resumeThread(
    client: CodexAppServerClient,
    threadId: string,
    cwd: string,
  ): Promise<void> {
    await client.request("thread/resume", {
      threadId,
      history: null,
      path: null,
      model: null,
      modelProvider: null,
      cwd,
      approvalPolicy: resolveApprovalPolicyForAutoExecuteTools(false),
      sandbox: normalizeSandboxMode(),
      config: null,
      baseInstructions: null,
      developerInstructions: null,
      personality: null,
      persistExtendedHistory: false,
    });
  }
}

let cachedCodexThreadHistoryReader: CodexThreadHistoryReader | null = null;

export const getCodexThreadHistoryReader = (): CodexThreadHistoryReader => {
  if (!cachedCodexThreadHistoryReader) {
    cachedCodexThreadHistoryReader = new CodexThreadHistoryReader();
  }
  return cachedCodexThreadHistoryReader;
};
