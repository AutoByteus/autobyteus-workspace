import { spawn } from "node:child_process";
import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import type { LlmProviderService } from "../../llm-management/llm-providers/services/llm-provider-service.js";
import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type {
  CodexAppServerClientManager,
} from "../../runtime-management/codex/client/codex-app-server-client-manager.js";
import { resolveClaudeCodeExecutablePath } from "../../runtime-management/claude/client/claude-sdk-executable-path.js";

export type ApplicationProviderCredentialReadiness = Readonly<{
  configured: boolean;
  reason: string | null;
}>;

export type ApplicationProviderCredentialReadinessPort = {
  getReadiness(input: {
    runtimeKind: RuntimeKind;
    model: ModelInfo;
    workspaceRootPath: string;
  }): Promise<ApplicationProviderCredentialReadiness>;
};

type CommandResult = Readonly<{
  exitCode: number | null;
  stdout: string;
  stderr: string;
  error: Error | null;
}>;

const runCommand = (
  command: string,
  args: string[],
  timeoutMs = 5_000,
): Promise<CommandResult> => new Promise((resolve) => {
  let stdout = "";
  let stderr = "";
  let settled = false;
  const child = spawn(command, args, {
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const finish = (result: CommandResult): void => {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    resolve(result);
  };
  child.stdout.on("data", (chunk: Buffer) => {
    stdout += chunk.toString("utf8");
  });
  child.stderr.on("data", (chunk: Buffer) => {
    stderr += chunk.toString("utf8");
  });
  child.once("error", (error) => {
    finish({ exitCode: null, stdout, stderr, error });
  });
  child.once("close", (exitCode) => {
    finish({ exitCode, stdout, stderr, error: null });
  });
  const timeout = setTimeout(() => {
    child.kill("SIGTERM");
    finish({
      exitCode: null,
      stdout,
      stderr,
      error: new Error(`Credential readiness command timed out after ${timeoutMs}ms.`),
    });
  }, timeoutMs);
});

const describeFailure = (label: string, result: CommandResult): string => {
  const detail = result.error?.message
    ?? result.stderr.trim()
    ?? result.stdout.trim()
    ?? `exit code ${String(result.exitCode)}`;
  return `${label} authentication is unavailable: ${detail}`;
};

export class ApplicationProviderCredentialReadinessAdapter
implements ApplicationProviderCredentialReadinessPort {
  constructor(private readonly dependencies: {
    llmProviderService: Pick<LlmProviderService, "listProviderSettings">;
    codexClientManager: Pick<
      CodexAppServerClientManager,
      "acquireClient" | "releaseClient"
    >;
    commandRunner?: typeof runCommand;
  }) {}

  async getReadiness(input: {
    runtimeKind: RuntimeKind;
    model: ModelInfo;
    workspaceRootPath: string;
  }): Promise<ApplicationProviderCredentialReadiness> {
    switch (input.runtimeKind) {
      case RuntimeKind.CODEX_APP_SERVER:
        return this.readCodexReadiness(input.workspaceRootPath);
      case RuntimeKind.CLAUDE_AGENT_SDK:
        return this.readClaudeReadiness();
      case RuntimeKind.AUTOBYTEUS:
        return this.readAutobyteusReadiness(input.model);
    }
  }

  private async readCodexReadiness(
    workspaceRootPath: string,
  ): Promise<ApplicationProviderCredentialReadiness> {
    try {
      const client = await this.dependencies.codexClientManager
        .acquireClient(workspaceRootPath);
      try {
        const response = await client.request<{
          account?: unknown;
          requiresOpenaiAuth?: unknown;
        }>("account/read", { refreshToken: false });
        const configured = response.requiresOpenaiAuth !== true || response.account != null;
        return configured
          ? { configured: true, reason: null }
          : {
              configured: false,
              reason: "Codex authentication is unavailable: no logged-in account.",
            };
      } finally {
        await this.dependencies.codexClientManager.releaseClient(workspaceRootPath);
      }
    } catch (error) {
      return {
        configured: false,
        reason: `Codex authentication is unavailable: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  private async readClaudeReadiness(): Promise<ApplicationProviderCredentialReadiness> {
    const result = await (this.dependencies.commandRunner ?? runCommand)(
      resolveClaudeCodeExecutablePath(),
      ["auth", "status", "--json"],
    );
    let loggedIn = false;
    if (result.exitCode === 0) {
      try {
        const payload = JSON.parse(result.stdout) as { loggedIn?: unknown };
        loggedIn = payload.loggedIn === true;
      } catch {
        loggedIn = /\blogged\s+in\b/i.test(`${result.stdout}\n${result.stderr}`);
      }
    }
    return loggedIn
      ? { configured: true, reason: null }
      : { configured: false, reason: describeFailure("Claude", result) };
  }

  private async readAutobyteusReadiness(
    model: ModelInfo,
  ): Promise<ApplicationProviderCredentialReadiness> {
    try {
      const settings = await this.dependencies.llmProviderService
        .listProviderSettings(RuntimeKind.AUTOBYTEUS);
      const provider = settings.find((entry) =>
        entry.provider.id === model.provider_id
        && entry.llmModels.some((candidate) =>
          candidate.model_identifier === model.model_identifier));
      if (!provider) {
        return {
          configured: false,
          reason: `Provider '${model.provider_id}' is unavailable for model '${model.model_identifier}'.`,
        };
      }
      if (provider.provider.id === LLMProvider.OLLAMA) {
        return { configured: true, reason: null };
      }
      return provider.provider.apiKeyConfigured
        ? { configured: true, reason: null }
        : {
            configured: false,
            reason: `Provider '${provider.provider.name}' has no configured credential.`,
          };
    } catch (error) {
      return {
        configured: false,
        reason: `Provider credential readiness could not be determined: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }
}
