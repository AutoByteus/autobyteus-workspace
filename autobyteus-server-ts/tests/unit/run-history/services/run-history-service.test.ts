import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { RunKnownStatus, RunManifest } from "../../../../src/run-history/domain/models.js";
import { RunHistoryService } from "../../../../src/run-history/services/run-history-service.js";

const makeManifest = (): RunManifest => ({
  agentDefinitionId: "agent-def-1",
  workspaceRootPath: "/tmp/workspace",
  llmModelIdentifier: "model-x",
  llmConfig: null,
  autoExecuteTools: false,
  skillAccessMode: null,
  runtimeKind: "codex_app_server",
  runtimeReference: {
    runtimeKind: "codex_app_server",
    sessionId: "session-1",
    threadId: "thread-1",
    metadata: null,
  },
});

describe("RunHistoryService runtime-event status derivation", () => {
  let tempDir = "";
  let service: RunHistoryService;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "run-history-service-"));
    service = new RunHistoryService(tempDir);
  });

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  const seedRun = async (runId: string, status: RunKnownStatus) => {
    const manifestStore = (service as any).manifestStore;
    const indexStore = (service as any).indexStore;

    await manifestStore.writeManifest(runId, makeManifest());
    await indexStore.upsertRow({
      runId,
      agentDefinitionId: "agent-def-1",
      agentName: "Agent",
      workspaceRootPath: "/tmp/workspace",
      summary: "seed",
      lastActivityAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
      lastKnownStatus: status,
    });
  };

  const readStatus = async (runId: string): Promise<RunKnownStatus | null> => {
    const indexStore = (service as any).indexStore;
    const row = await indexStore.getRow(runId);
    return row?.lastKnownStatus ?? null;
  };

  const readManifestThreadId = async (runId: string): Promise<string | null> => {
    const manifestStore = (service as any).manifestStore;
    const manifest = await manifestStore.readManifest(runId);
    return manifest?.runtimeReference.threadId ?? null;
  };

  const readManifestSessionId = async (runId: string): Promise<string | null> => {
    const manifestStore = (service as any).manifestStore;
    const manifest = await manifestStore.readManifest(runId);
    return manifest?.runtimeReference.sessionId ?? null;
  };

  it("treats alias and canonical turn lifecycle methods equivalently", async () => {
    await seedRun("run-alias", "IDLE");
    await seedRun("run-canonical", "IDLE");

    await service.onRuntimeEvent("run-alias", { method: "turn.started", params: {} });
    await service.onRuntimeEvent("run-canonical", { method: "turn/started", params: {} });
    expect(await readStatus("run-alias")).toBe("ACTIVE");
    expect(await readStatus("run-canonical")).toBe("ACTIVE");

    await service.onRuntimeEvent("run-alias", { method: "turn.completed", params: {} });
    await service.onRuntimeEvent("run-canonical", { method: "turn/completed", params: {} });
    expect(await readStatus("run-alias")).toBe("IDLE");
    expect(await readStatus("run-canonical")).toBe("IDLE");
  });

  it("keeps previous status when runtime method is missing", async () => {
    await seedRun("run-1", "ERROR");
    await service.onRuntimeEvent("run-1", { params: { a: 1 } });
    expect(await readStatus("run-1")).toBe("ERROR");
  });

  it("updates manifest runtime thread id when runtime payload includes a newer thread id", async () => {
    await seedRun("run-thread", "ACTIVE");
    expect(await readManifestThreadId("run-thread")).toBe("thread-1");

    await service.onRuntimeEvent("run-thread", {
      method: "thread/token_usage/updated",
      params: { threadId: "thread-2" },
    });

    expect(await readManifestThreadId("run-thread")).toBe("thread-2");
  });

  it("promotes Claude session-id hints into persisted sessionId after runtime events", async () => {
    const manifestStore = (service as any).manifestStore;
    const indexStore = (service as any).indexStore;
    const manifest: RunManifest = {
      ...makeManifest(),
      runtimeKind: "claude_agent_sdk",
      runtimeReference: {
        runtimeKind: "claude_agent_sdk",
        sessionId: "run-claude",
        threadId: "run-claude",
        metadata: null,
      },
    };

    await manifestStore.writeManifest("run-claude", manifest);
    await indexStore.upsertRow({
      runId: "run-claude",
      agentDefinitionId: "agent-def-1",
      agentName: "Agent",
      workspaceRootPath: "/tmp/workspace",
      summary: "seed",
      lastActivityAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
      lastKnownStatus: "ACTIVE",
    });

    await service.onRuntimeEvent("run-claude", {
      method: "turn/completed",
      params: { sessionId: "claude-session-final" },
    });

    expect(await readManifestSessionId("run-claude")).toBe("claude-session-final");
    expect(await readManifestThreadId("run-claude")).toBe("claude-session-final");
  });
});
