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
      try {
        const response = await client.request<unknown>("thread/read", {
          threadId: normalizedThreadId,
          includeTurns: true,
        });
        return asObject(response);
      } catch (error) {
        const message = String(error);
        const threadNotLoaded = message.toLowerCase().includes("thread not loaded");
        if (!threadNotLoaded) {
          throw error;
        }

        await this.resumeThread(client, normalizedThreadId, cwd);
        const retriedResponse = await client.request<unknown>("thread/read", {
          threadId: normalizedThreadId,
          includeTurns: true,
        });
        return asObject(retriedResponse);
      }
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
