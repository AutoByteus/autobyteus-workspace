import { resolve as resolvePath } from "node:path";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { LLMRuntime } from "autobyteus-ts/llm/runtimes.js";
import { describe, expect, it, vi } from "vitest";
import {
  ApplicationProviderCredentialReadinessAdapter,
  type ApplicationCredentialAuthority,
} from "../../../src/application-platform/launch-configuration/application-provider-credential-readiness-adapter.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const model = (runtime: string, providerId = "provider-a") => ({
  runtime,
  provider_id: providerId,
}) as never;

const buildAdapter = (input?: { apiKeyConfigured?: boolean }) => {
  const getProviderCredentialSetting = vi.fn(async (providerId: string) => ({
    provider: { id: providerId, name: `Provider ${providerId}` },
    apiKeyConfigured: input?.apiKeyConfigured ?? true,
  }));
  const request = vi.fn(async () => ({ requiresOpenaiAuth: false }));
  const acquireClient = vi.fn(async () => ({ request }));
  const releaseClient = vi.fn(async () => undefined);
  const commandRunner = vi.fn(async () => ({
    exitCode: 0,
    stdout: JSON.stringify({ loggedIn: true }),
    stderr: "",
    error: null,
  }));
  return {
    adapter: new ApplicationProviderCredentialReadinessAdapter({
      llmProviderService: { getProviderCredentialSetting },
      codexClientManager: { acquireClient, releaseClient } as never,
      commandRunner,
    }),
    acquireClient,
    commandRunner,
    getProviderCredentialSetting,
    releaseClient,
    request,
  };
};

describe("ApplicationProviderCredentialReadinessAdapter", () => {
  it.each([
    [LLMRuntime.API, "creator-provider", "creator-provider"],
    [LLMRuntime.OPENAI_COMPATIBLE, "custom:provider|one", "custom:provider|one"],
    [LLMRuntime.AUTOBYTEUS, "creator-provider", LLMProvider.AUTOBYTEUS],
  ])("maps %s models to the exact credential-owning provider", async (
    runtime,
    modelProviderId,
    expectedProviderId,
  ) => {
    const { adapter, getProviderCredentialSetting } = buildAdapter();
    const authority = adapter.resolveAuthority({
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      model: model(runtime, modelProviderId),
      workspaceRootPath: "/runtime/app",
    });

    expect(authority).toEqual({ kind: "provider", providerId: expectedProviderId });
    expect(adapter.getAuthorityCacheKey(authority)).toBe(
      JSON.stringify(["provider", expectedProviderId]),
    );
    await expect(adapter.getReadiness(authority)).resolves.toEqual({
      configured: true,
      reason: null,
    });
    expect(getProviderCredentialSetting).toHaveBeenCalledExactlyOnceWith(
      expectedProviderId,
      RuntimeKind.AUTOBYTEUS,
    );
  });

  it.each([LLMRuntime.OLLAMA, LLMRuntime.LMSTUDIO])(
    "treats exact available %s models as not requiring an API credential",
    async (runtime) => {
      const { adapter, getProviderCredentialSetting } = buildAdapter();
      const authority = adapter.resolveAuthority({
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        model: model(runtime),
        workspaceRootPath: "/runtime/app",
      });

      expect(authority).toEqual({ kind: "no_credential", runtime });
      expect(adapter.getAuthorityCacheKey(authority)).toBe(
        JSON.stringify(["no_credential", runtime]),
      );
      await expect(adapter.getReadiness(authority)).resolves.toEqual({
        configured: true,
        reason: null,
      });
      expect(getProviderCredentialSetting).not.toHaveBeenCalled();
    },
  );

  it("reports a missing credential without performing model discovery", async () => {
    const { adapter, getProviderCredentialSetting } = buildAdapter({ apiKeyConfigured: false });
    const authority = adapter.resolveAuthority({
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      model: model(LLMRuntime.API, "provider-a"),
      workspaceRootPath: "/runtime/app",
    });

    await expect(adapter.getReadiness(authority)).resolves.toEqual({
      configured: false,
      reason: "Provider 'Provider provider-a' has no configured credential.",
    });
    expect(getProviderCredentialSetting).toHaveBeenCalledOnce();
  });

  it("normalizes Codex workspace authority and performs the native account check", async () => {
    const { adapter, acquireClient, releaseClient, request } = buildAdapter();
    const authority = adapter.resolveAuthority({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      model: model(LLMRuntime.API),
      workspaceRootPath: "./relative-workspace",
    });

    expect(authority).toEqual({
      kind: "codex_workspace",
      workspaceRootPath: resolvePath("./relative-workspace"),
    });
    expect(adapter.getAuthorityCacheKey(authority)).toBe(JSON.stringify([
      "codex_workspace",
      resolvePath("./relative-workspace"),
    ]));
    await expect(adapter.getReadiness(authority)).resolves.toEqual({
      configured: true,
      reason: null,
    });
    expect(acquireClient).toHaveBeenCalledExactlyOnceWith(resolvePath("./relative-workspace"));
    expect(request).toHaveBeenCalledExactlyOnceWith("account/read", { refreshToken: false });
    expect(releaseClient).toHaveBeenCalledExactlyOnceWith(resolvePath("./relative-workspace"));
  });

  it("keys Claude once per process and retains its native authentication command", async () => {
    const { adapter, commandRunner } = buildAdapter();
    const authority = adapter.resolveAuthority({
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      model: model(LLMRuntime.API),
      workspaceRootPath: "/runtime/app",
    });

    expect(authority).toEqual({ kind: "claude_process" });
    expect(adapter.getAuthorityCacheKey(authority)).toBe(JSON.stringify(["claude_process"]));
    await expect(adapter.getReadiness(authority)).resolves.toEqual({
      configured: true,
      reason: null,
    });
    expect(commandRunner).toHaveBeenCalledOnce();
  });

  it("fails unknown runtimes closed without caching or reading provider credentials", async () => {
    const { adapter, getProviderCredentialSetting } = buildAdapter();
    const authority = adapter.resolveAuthority({
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      model: model("future-runtime"),
      workspaceRootPath: "/runtime/app",
    });

    expect(authority).toEqual({ kind: "unsupported", runtime: "future-runtime" });
    expect(adapter.getAuthorityCacheKey(authority)).toBeNull();
    await expect(adapter.getReadiness(authority)).resolves.toEqual({
      configured: false,
      reason: "Credential readiness is unsupported for model runtime 'future-runtime'.",
    });
    expect(getProviderCredentialSetting).not.toHaveBeenCalled();
  });

  it("keeps typed tuple keys collision-safe", () => {
    const { adapter } = buildAdapter();
    const left: ApplicationCredentialAuthority = {
      kind: "provider",
      providerId: "a|b:c",
    };
    const right: ApplicationCredentialAuthority = {
      kind: "provider",
      providerId: "a:b|c",
    };

    expect(adapter.getAuthorityCacheKey(left)).not.toBe(
      adapter.getAuthorityCacheKey(right),
    );
  });
});
