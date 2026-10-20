import { resolve as resolvePath } from "node:path";
import { LLMRuntime } from "autobyteus-ts/llm/runtimes.js";
import { describe, expect, it, vi } from "vitest";
import {
  ApplicationProviderCredentialReadinessAdapter,
  type ApplicationCredentialAuthority,
} from "../../../src/application-platform/launch-configuration/application-provider-credential-readiness-adapter.js";
import type { SignInReading } from "../../../src/runtime-management/agent-runtimes/agent-runtime-sign-in-reader.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const model = (runtime: string, providerId = "provider-a") => ({
  runtime,
  provider_id: providerId,
}) as never;

const buildAdapter = (input?: {
  apiKeyConfigured?: boolean;
  codex?: SignInReading;
  claude?: SignInReading;
}) => {
  const getProviderCredentialSetting = vi.fn(async (providerId: string) => ({
    provider: { id: providerId, name: `Provider ${providerId}` },
    apiKeyConfigured: input?.apiKeyConfigured ?? true,
  }));
  const read = vi.fn(async (runtimeKind: RuntimeKind): Promise<SignInReading> =>
    runtimeKind === RuntimeKind.CODEX_APP_SERVER
      ? input?.codex ?? { state: "notRequired" }
      : input?.claude ?? { state: "signedIn" });
  return {
    adapter: new ApplicationProviderCredentialReadinessAdapter({
      llmProviderService: { getProviderCredentialSetting },
      signInReader: { read },
    }),
    getProviderCredentialSetting,
    read,
  };
};

describe("ApplicationProviderCredentialReadinessAdapter", () => {
  it.each([
    [LLMRuntime.API, "creator-provider", "creator-provider"],
    [LLMRuntime.OPENAI_COMPATIBLE, "custom:provider|one", "custom:provider|one"],
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

  it("normalizes Codex workspace authority and reads its sign-in in that workspace", async () => {
    const { adapter, read } = buildAdapter();
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
    expect(read).toHaveBeenCalledExactlyOnceWith(RuntimeKind.CODEX_APP_SERVER, {
      cwd: resolvePath("./relative-workspace"),
    });
  });

  it.each([
    [{ state: "signedIn" } as const, { configured: true, reason: null }],
    [{ state: "notRequired" } as const, { configured: true, reason: null }],
    [
      { state: "signedOut", detail: "no logged-in account." } as const,
      { configured: false, reason: "Codex authentication is unavailable: no logged-in account." },
    ],
    [
      { state: "unknown", detail: "spawn codex ENOENT" } as const,
      { configured: false, reason: "Codex authentication is unavailable: spawn codex ENOENT" },
    ],
  ])("maps the Codex reading %o to launch readiness", async (reading, expected) => {
    const { adapter } = buildAdapter({ codex: reading });
    await expect(adapter.getReadiness({ kind: "codex_workspace", workspaceRootPath: "/w" }))
      .resolves.toEqual(expected);
  });

  it("keeps Claude's failure text in its reason", async () => {
    const { adapter } = buildAdapter({ claude: { state: "unknown", detail: "Command timed out after 10000ms." } });
    await expect(adapter.getReadiness({ kind: "claude_process" })).resolves.toEqual({
      configured: false,
      reason: "Claude authentication is unavailable: Command timed out after 10000ms.",
    });
  });

  it("keys Claude once per process and reads its sign-in through the reader", async () => {
    const { adapter, read } = buildAdapter();
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
    expect(read).toHaveBeenCalledOnce();
    expect(read.mock.calls[0]?.[0]).toBe(RuntimeKind.CLAUDE_AGENT_SDK);
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
