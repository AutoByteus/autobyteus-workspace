import { resolve as resolvePath } from "node:path";
import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import { LLMRuntime } from "autobyteus-ts/llm/runtimes.js";
import type { LlmProviderService } from "../../llm-management/llm-providers/services/llm-provider-service.js";
import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type {
  AgentRuntimeSignInReader,
  SignInReading,
} from "../../runtime-management/agent-runtimes/agent-runtime-sign-in-reader.js";

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

/** Signed in, or no sign-in required, is configured; otherwise the runtime's reason text. */
const toReadiness = (
  label: string,
  reading: SignInReading,
): ApplicationProviderCredentialReadiness => {
  switch (reading.state) {
    case "signedIn":
    case "notRequired":
      return { configured: true, reason: null };
    case "signedOut":
    case "unknown":
      return { configured: false, reason: `${label} authentication is unavailable: ${reading.detail}` };
  }
};

export class ApplicationProviderCredentialReadinessAdapter
implements ApplicationProviderCredentialReadinessPort {
  constructor(private readonly dependencies: {
    llmProviderService: Pick<LlmProviderService, "getProviderCredentialSetting">;
    /** The one owner of runtime sign-in reads (Codex `account/read`, `claude auth status`). */
    signInReader: Pick<AgentRuntimeSignInReader, "read">;
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
      case RuntimeKind.ANTIGRAVITY_CLI:
      case RuntimeKind.GROK_BUILD:
        return Object.freeze({ kind: "unsupported", runtime: input.runtimeKind });
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
        return toReadiness("Codex", await this.dependencies.signInReader.read(
          RuntimeKind.CODEX_APP_SERVER,
          { cwd: authority.workspaceRootPath },
        ));
      case "claude_process":
        return toReadiness("Claude", await this.dependencies.signInReader.read(
          RuntimeKind.CLAUDE_AGENT_SDK,
          { cwd: process.cwd() },
        ));
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
