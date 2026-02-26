import { CodexAppServerClient } from "./codex-app-server-client.js";

const DEFAULT_APP_SERVER_COMMAND = "codex";
const DEFAULT_APP_SERVER_ARGS = ["app-server"];
const DEFAULT_REQUEST_TIMEOUT_MS = 120_000;

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

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

const resolveRequestTimeoutMs = (): number => {
  const raw = Number(process.env.CODEX_APP_SERVER_REQUEST_TIMEOUT_MS ?? DEFAULT_REQUEST_TIMEOUT_MS);
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_REQUEST_TIMEOUT_MS;
  }
  return Math.floor(raw);
};

const resolveLaunchCommand = (): string =>
  process.env.CODEX_APP_SERVER_COMMAND?.trim() || DEFAULT_APP_SERVER_COMMAND;

export class CodexThreadHistoryReader {
  async readThread(
    threadId: string,
    cwd: string,
  ): Promise<Record<string, unknown> | null> {
    const normalizedThreadId = asString(threadId);
    if (!normalizedThreadId) {
      return null;
    }

    const client = new CodexAppServerClient({
      command: resolveLaunchCommand(),
      args: parseArgs(),
      cwd,
      requestTimeoutMs: resolveRequestTimeoutMs(),
    });

    try {
      await client.start();
      await this.initializeClient(client);
      const response = await client.request<unknown>("thread/read", {
        threadId: normalizedThreadId,
        includeTurns: true,
      });
      return asObject(response);
    } catch (error) {
      logger.warn(
        `Failed to read Codex thread '${normalizedThreadId}': ${String(error)}`,
      );
      return null;
    } finally {
      await client.close();
    }
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
}

let cachedCodexThreadHistoryReader: CodexThreadHistoryReader | null = null;

export const getCodexThreadHistoryReader = (): CodexThreadHistoryReader => {
  if (!cachedCodexThreadHistoryReader) {
    cachedCodexThreadHistoryReader = new CodexThreadHistoryReader();
  }
  return cachedCodexThreadHistoryReader;
};
