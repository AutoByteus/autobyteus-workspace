import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RunProjectionProviderRegistry } from "../../../../src/run-history/projection/run-projection-provider-registry.js";
import type { RunProjectionProvider } from "../../../../src/run-history/projection/run-projection-provider-port.js";
import { RunProjectionService } from "../../../../src/run-history/services/run-projection-service.js";
import { RunManifestStore } from "../../../../src/run-history/store/run-manifest-store.js";
import type { RunManifest } from "../../../../src/run-history/domain/models.js";

const createManifest = (
  runtimeKind: "autobyteus" | "codex_app_server",
  runId: string,
): RunManifest => ({
  agentDefinitionId: "agent-definition-1",
  workspaceRootPath: "/tmp/workspace",
  llmModelIdentifier: "gpt-5.2-codex",
  llmConfig: null,
  autoExecuteTools: false,
  skillAccessMode: null,
  runtimeKind,
  runtimeReference: {
    runtimeKind,
    sessionId: runId,
    threadId: runtimeKind === "codex_app_server" ? "thread-1" : null,
    metadata: null,
  },
});

describe("RunProjectionService", () => {
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
    providerId: string,
    runtimeKind: "autobyteus" | "codex_app_server" | undefined,
    impl: RunProjectionProvider["buildProjection"],
  ): RunProjectionProvider => ({
    providerId,
    runtimeKind,
    buildProjection: impl,
  });

  it("uses runtime provider first and falls back to local provider when primary result is null", async () => {
    const memoryDir = await createTempMemoryDir();
    const runId = "run-codex-fallback";
    const manifestStore = new RunManifestStore(memoryDir);
    await manifestStore.writeManifest(runId, createManifest("codex_app_server", runId));

    const codexProvider = createProvider(
      "codex-primary",
      "codex_app_server",
      vi.fn(async () => null),
    );
    const fallbackProvider = createProvider(
      "local-fallback",
      "autobyteus",
      vi.fn(async (input) => ({
        runId: input.runId,
        conversation: [{ kind: "message", role: "user", content: "local fallback", ts: 1 }],
        summary: "local fallback",
        lastActivityAt: "2026-02-24T00:00:01.000Z",
      })),
    );

    const service = new RunProjectionService(memoryDir, {
      manifestStore,
      providerRegistry: new RunProjectionProviderRegistry(fallbackProvider, [codexProvider]),
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
    const manifestStore = new RunManifestStore(memoryDir);
    await manifestStore.writeManifest(runId, createManifest("codex_app_server", runId));

    const codexProvider = createProvider(
      "codex-primary",
      "codex_app_server",
      vi.fn(async (input) => ({
        runId: input.runId,
        conversation: [{ kind: "message", role: "assistant", content: "primary", ts: 2 }],
        summary: "primary",
        lastActivityAt: "2026-02-24T00:00:02.000Z",
      })),
    );
    const fallbackProvider = createProvider(
      "local-fallback",
      "autobyteus",
      vi.fn(async () => ({
        runId,
        conversation: [{ kind: "message", role: "assistant", content: "fallback", ts: 3 }],
        summary: "fallback",
        lastActivityAt: "2026-02-24T00:00:03.000Z",
      })),
    );

    const service = new RunProjectionService(memoryDir, {
      manifestStore,
      providerRegistry: new RunProjectionProviderRegistry(fallbackProvider, [codexProvider]),
    });

    const projection = await service.getProjection(runId);
    expect(codexProvider.buildProjection).toHaveBeenCalledTimes(1);
    expect(fallbackProvider.buildProjection).not.toHaveBeenCalled();
    expect(projection.summary).toBe("primary");
  });

  it("returns deterministic empty projection when both providers fail", async () => {
    const memoryDir = await createTempMemoryDir();
    const runId = "run-codex-empty";
    const manifestStore = new RunManifestStore(memoryDir);
    await manifestStore.writeManifest(runId, createManifest("codex_app_server", runId));

    const codexProvider = createProvider(
      "codex-primary",
      "codex_app_server",
      vi.fn(async () => {
        throw new Error("primary failed");
      }),
    );
    const fallbackProvider = createProvider(
      "local-fallback",
      "autobyteus",
      vi.fn(async () => null),
    );

    const service = new RunProjectionService(memoryDir, {
      manifestStore,
      providerRegistry: new RunProjectionProviderRegistry(fallbackProvider, [codexProvider]),
    });

    const projection = await service.getProjection(runId);
    expect(projection.runId).toBe(runId);
    expect(projection.conversation).toEqual([]);
    expect(projection.summary).toBeNull();
    expect(projection.lastActivityAt).toBeNull();
  });
});
