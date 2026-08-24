import { spawn } from "node:child_process";
import { resolve as resolvePath } from "node:path";
import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { LLMRuntime } from "autobyteus-ts/llm/runtimes.js";
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

export type ApplicationCredentialAuthority =
  | Readonly<{ kind: "provider"; providerId: string }>
  | Readonly<{ kind: "codex_workspace"; workspaceRootPath: string }>
  | Readonly<{ kind: "claude_process" }>
  | Readonly<{
      kind: "no_credential";
      runtime: LLMRuntime.OLLAMA | LLMRuntime.LMSTUDIO;
    }>
  | Readonly<{ kind: "unsupported"; runtime: string }>;

export type ApplicationCredentialAuthorityInput = Readonly<{
  runtimeKind: RuntimeKind;
  model: ModelInfo;
  workspaceRootPath: string;
}>;

export type ApplicationProviderCredentialReadinessPort = {
  resolveAuthority(input: ApplicationCredentialAuthorityInput): ApplicationCredentialAuthority;
  getAuthorityCacheKey(authority: ApplicationCredentialAuthority): string | null;
  getReadiness(
    authority: ApplicationCredentialAuthority,
  ): Promise<ApplicationProviderCredentialReadiness>;
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
    llmProviderService: Pick<LlmProviderService, "getProviderCredentialSetting">;
    codexClientManager: Pick<
      CodexAppServerClientManager,
      "acquireClient" | "releaseClient"
    >;
    commandRunner?: typeof runCommand;
  }) {}

  resolveAuthority(
    input: ApplicationCredentialAuthorityInput,
  ): ApplicationCredentialAuthority {
    switch (input.runtimeKind) {
      case RuntimeKind.CODEX_APP_SERVER:
        return Object.freeze({
          kind: "codex_workspace",
          workspaceRootPath: resolvePath(input.workspaceRootPath.trim()),
        });
      case RuntimeKind.CLAUDE_AGENT_SDK:
        return Object.freeze({ kind: "claude_process" });
      case RuntimeKind.AUTOBYTEUS:
        return this.resolveAutoByteusAuthority(input.model);
    }
  }

  getAuthorityCacheKey(authority: ApplicationCredentialAuthority): string | null {
    switch (authority.kind) {
      case "provider":
        return JSON.stringify([authority.kind, authority.providerId]);
      case "codex_workspace":
        return JSON.stringify([authority.kind, authority.workspaceRootPath]);
      case "claude_process":
        return JSON.stringify([authority.kind]);
      case "no_credential":
        return JSON.stringify([authority.kind, authority.runtime]);
      case "unsupported":
        return null;
    }
  }

  async getReadiness(
    authority: ApplicationCredentialAuthority,
  ): Promise<ApplicationProviderCredentialReadiness> {
    switch (authority.kind) {
      case "provider":
        return this.readProviderReadiness(authority.providerId);
      case "codex_workspace":
        return this.readCodexReadiness(authority.workspaceRootPath);
      case "claude_process":
        return this.readClaudeReadiness();
      case "no_credential":
        return { configured: true, reason: null };
      case "unsupported":
        return {
          configured: false,
          reason: `Credential readiness is unsupported for model runtime '${authority.runtime}'.`,
        };
    }
  }

  private resolveAutoByteusAuthority(model: ModelInfo): ApplicationCredentialAuthority {
    switch (model.runtime) {
      case LLMRuntime.API:
      case LLMRuntime.OPENAI_COMPATIBLE:
        return this.providerAuthority(model.provider_id, model.runtime);
      case LLMRuntime.AUTOBYTEUS:
        return Object.freeze({
          kind: "provider",
          providerId: LLMProvider.AUTOBYTEUS,
        });
      case LLMRuntime.OLLAMA:
      case LLMRuntime.LMSTUDIO:
        return Object.freeze({ kind: "no_credential", runtime: model.runtime });
      default:
        return Object.freeze({ kind: "unsupported", runtime: String(model.runtime) });
    }
  }

  private providerAuthority(
    providerId: string,
    runtime: string,
  ): ApplicationCredentialAuthority {
    const normalized = providerId.trim();
    return normalized
      ? Object.freeze({ kind: "provider", providerId: normalized })
      : Object.freeze({ kind: "unsupported", runtime });
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

  private async readProviderReadiness(
    providerId: string,
  ): Promise<ApplicationProviderCredentialReadiness> {
    try {
      const setting = await this.dependencies.llmProviderService
        .getProviderCredentialSetting(providerId, RuntimeKind.AUTOBYTEUS);
      return setting.apiKeyConfigured
        ? { configured: true, reason: null }
        : {
            configured: false,
            reason: `Provider '${setting.provider.name}' has no configured credential.`,
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
