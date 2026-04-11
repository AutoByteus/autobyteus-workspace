import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import type { RunProjectionProvider } from "../../../../src/run-history/projection/run-projection-types.js";
import { AgentRunViewProjectionService } from "../../../../src/run-history/services/agent-run-view-projection-service.js";
import { AgentRunMetadataStore } from "../../../../src/run-history/store/agent-run-metadata-store.js";
import type { AgentRunMetadata } from "../../../../src/run-history/store/agent-run-metadata-types.js";

const { FakeRunProjectionProviderRegistry } = vi.hoisted(() => ({
  FakeRunProjectionProviderRegistry: class {
    private readonly fallbackProvider: RunProjectionProvider;
    private readonly providersByRuntime = new Map<string, RunProjectionProvider>();

    constructor(
      fallbackProvider: RunProjectionProvider,
      runtimeProviders: RunProjectionProvider[] = [],
    ) {
      this.fallbackProvider = fallbackProvider;
      for (const provider of runtimeProviders) {
        if (provider.runtimeKind) {
          this.providersByRuntime.set(provider.runtimeKind, provider);
        }
      }
    }

    resolveProvider(runtimeKind: string): RunProjectionProvider {
      return this.providersByRuntime.get(runtimeKind) ?? this.fallbackProvider;
    }

    resolveFallbackProvider(): RunProjectionProvider {
      return this.fallbackProvider;
    }
  },
}));

vi.mock("../../../../src/run-history/projection/run-projection-provider-registry.js", () => ({
  RunProjectionProviderRegistry: FakeRunProjectionProviderRegistry,
  getRunProjectionProviderRegistry: vi.fn(() => {
    throw new Error("getRunProjectionProviderRegistry should not be used in this unit test");
  }),
}));

const createMetadata = (
  runtimeKind: RuntimeKind,
  runId: string,
): AgentRunMetadata => ({
  runId,
  agentDefinitionId: "agent-definition-1",
  workspaceRootPath: "/tmp/workspace",
  llmModelIdentifier: "gpt-5.2-codex",
  llmConfig: null,
  autoExecuteTools: false,
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  runtimeKind,
  platformAgentRunId: runtimeKind === RuntimeKind.CODEX_APP_SERVER ? "thread-1" : runId,
  lastKnownStatus: "IDLE",
});

describe("AgentRunViewProjectionService", () => {
  const tempDirs = new Set<string>();

  afterEach(async () => {
    for (const dir of tempDirs) {
      await fs.rm(dir, { recursive: true, force: true });
    }
    tempDirs.clear();
  });

  const createTempMemoryDir = async (): Promise<string> => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "run-projection-service-"));
    tempDirs.add(dir);
    return dir;
  };

  const createProvider = (
    runtimeKind: "autobyteus" | "codex_app_server" | undefined,
    impl: RunProjectionProvider["buildProjection"],
  ): RunProjectionProvider => ({
    runtimeKind,
    buildProjection: impl,
  });

  it("uses runtime provider first and falls back to local provider when primary result is null", async () => {
    const memoryDir = await createTempMemoryDir();
    const runId = "run-codex-fallback";
    const metadataStore = new AgentRunMetadataStore(memoryDir);
    await metadataStore.writeMetadata(runId, createMetadata(RuntimeKind.CODEX_APP_SERVER, runId));

    const codexProvider = createProvider(
      "codex_app_server",
      vi.fn(async () => null),
    );
    const fallbackProvider = createProvider(
      "autobyteus",
      vi.fn(async (input) => ({
        runId: input.source.runId,
        conversation: [{ kind: "message", role: "user", content: "local fallback", ts: 1 }],
        activities: [],
        summary: "local fallback",
        lastActivityAt: "2026-02-24T00:00:01.000Z",
      })),
    );

    const service = new AgentRunViewProjectionService(memoryDir, {
      metadataStore,
      providerRegistry: new FakeRunProjectionProviderRegistry(fallbackProvider, [codexProvider]),
    });

    const projection = await service.getProjection(runId);
    expect(codexProvider.buildProjection).toHaveBeenCalledTimes(1);
    expect(fallbackProvider.buildProjection).toHaveBeenCalledTimes(1);
    expect(projection.summary).toBe("local fallback");
    expect(projection.conversation[0]?.content).toBe("local fallback");
  });

  it("returns primary runtime projection and skips fallback when primary has usable conversation", async () => {
    const memoryDir = await createTempMemoryDir();
    const runId = "run-codex-primary";
    const metadataStore = new AgentRunMetadataStore(memoryDir);
    await metadataStore.writeMetadata(runId, createMetadata(RuntimeKind.CODEX_APP_SERVER, runId));

    const codexProvider = createProvider(
      "codex_app_server",
      vi.fn(async (input) => ({
        runId: input.source.runId,
        conversation: [],
        activities: [
          {
            invocationId: "call-1",
            toolName: "run_bash",
            type: "terminal_command",
            status: "success",
            contextText: "pwd",
            arguments: { command: "pwd" },
            logs: [],
            result: { stdout: "/tmp" },
            error: null,
            ts: 2,
            detailLevel: "source_limited",
          },
        ],
        summary: "primary",
        lastActivityAt: "2026-02-24T00:00:02.000Z",
      })),
    );
    const fallbackProvider = createProvider(
      "autobyteus",
      vi.fn(async () => ({
        runId,
        conversation: [{ kind: "message", role: "assistant", content: "fallback", ts: 3 }],
        activities: [],
        summary: "fallback",
        lastActivityAt: "2026-02-24T00:00:03.000Z",
      })),
    );

    const service = new AgentRunViewProjectionService(memoryDir, {
      metadataStore,
      providerRegistry: new FakeRunProjectionProviderRegistry(fallbackProvider, [codexProvider]),
    });

    const projection = await service.getProjection(runId);
    expect(codexProvider.buildProjection).toHaveBeenCalledTimes(1);
    expect(fallbackProvider.buildProjection).not.toHaveBeenCalled();
    expect(projection.summary).toBe("primary");
    expect(projection.activities).toHaveLength(1);
  });

  it("returns deterministic empty projection when both providers fail", async () => {
    const memoryDir = await createTempMemoryDir();
    const runId = "run-codex-empty";
    const metadataStore = new AgentRunMetadataStore(memoryDir);
    await metadataStore.writeMetadata(runId, createMetadata(RuntimeKind.CODEX_APP_SERVER, runId));

    const codexProvider = createProvider(
      "codex_app_server",
      vi.fn(async () => {
        throw new Error("primary failed");
      }),
    );
    const fallbackProvider = createProvider(
      "autobyteus",
      vi.fn(async () => null),
    );

    const service = new AgentRunViewProjectionService(memoryDir, {
      metadataStore,
      providerRegistry: new FakeRunProjectionProviderRegistry(fallbackProvider, [codexProvider]),
    });

    const projection = await service.getProjection(runId);
    expect(projection.runId).toBe(runId);
    expect(projection.conversation).toEqual([]);
    expect(projection.activities).toEqual([]);
    expect(projection.summary).toBeNull();
    expect(projection.lastActivityAt).toBeNull();
  });
});
