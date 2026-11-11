import { isDelegated, isPeerStarted, peerDelegatedFromOf } from "../../../../src/run-history/store/agent-run-metadata-types.js";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRunMetadataStore } from "../../../../src/run-history/store/agent-run-metadata-store.js";
import type { AgentRunMetadata } from "../../../../src/run-history/store/agent-run-metadata-types.js";

const buildMetadata = (
  overrides: Partial<AgentRunMetadata> = {},
): AgentRunMetadata => ({
  runId: "run-1",
  agentDefinitionId: "agent-def-1",
  workspaceRootPath: "/tmp/workspace",
  memoryDir: "/tmp/memory/agents/run-1",
  llmModelIdentifier: "model-1",
  llmConfig: null,
  autoExecuteTools: false,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  platformAgentRunId: "thread-1",
  preparedAt: "2026-05-01T09:00:00.000Z",
  preparedExpiresAt: "2026-05-02T09:00:00.000Z",
  startedAt: "2026-05-01T09:05:00.000Z",
  applicationExecutionContext: null,
  ...overrides,
});

describe("AgentRunMetadataStore", () => {
  let memoryDir: string;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-run-metadata-store-"));
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("round-trips V2 resume/config metadata without durable history status fields", async () => {
    const store = new AgentRunMetadataStore(memoryDir);
    await store.writeMetadata("run-1", buildMetadata({
      workspaceRootPath: "/tmp/workspace/",
      memoryDir: path.join(memoryDir, "agents", "run-1"),
      platformAgentRunId: "  thread-1  ",
      applicationExecutionContext: {
        applicationId: "app-1",
        bindingId: "binding-1",
        producer: {
          agentRunId: "run-1",
          displayName: "Agent",
        },
      },
    }));

    const raw = JSON.parse(
      await fs.readFile(store.getMetadataPath("run-1"), "utf-8"),
    ) as Record<string, unknown>;
    expect(raw).not.toHaveProperty("lastKnownStatus");
    expect(raw).not.toHaveProperty("activationState");
    expect(raw).not.toHaveProperty("archivedAt");
    expect(raw.applicationExecutionContext).toEqual({
      applicationId: "app-1",
      bindingId: "binding-1",
      producer: {
        agentRunId: "run-1",
        displayName: "Agent",
      },
    });

    const metadata = await store.readMetadata("run-1");

    expect(metadata).toEqual(buildMetadata({
      workspaceRootPath: "/tmp/workspace",
      memoryDir: path.join(memoryDir, "agents", "run-1"),
      platformAgentRunId: "thread-1",
      applicationExecutionContext: {
        applicationId: "app-1",
        bindingId: "binding-1",
        producer: {
          agentRunId: "run-1",
          displayName: "Agent",
        },
      },
    }));
  });

  it("ignores legacy durable status fields when reading older metadata files", async () => {
    const store = new AgentRunMetadataStore(memoryDir);
    const metadataPath = store.getMetadataPath("run-legacy");
    await fs.mkdir(path.dirname(metadataPath), { recursive: true });
    await fs.writeFile(
      metadataPath,
      JSON.stringify({
        runId: "run-legacy",
        agentDefinitionId: "agent-def-1",
        workspaceRootPath: "/tmp/workspace",
        llmModelIdentifier: "model-1",
        llmConfig: null,
        autoExecuteTools: false,
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        platformAgentRunId: "thread-legacy",
        lastKnownStatus: "TERMINATED",
        activationState: "ACTIVATION_FAILED",
        archivedAt: "2026-05-01T10:00:00.000Z",
      }),
      "utf-8",
    );

    const metadata = await store.readMetadata("run-legacy");

    expect(metadata).toEqual(expect.objectContaining({
      runId: "run-legacy",
      memoryDir: path.join(memoryDir, "agents", "run-legacy"),
      platformAgentRunId: "thread-legacy",
      preparedAt: null,
      preparedExpiresAt: null,
      startedAt: null,
      applicationExecutionContext: null,
    }));
    expect(metadata).not.toHaveProperty("lastKnownStatus");
    expect(metadata).not.toHaveProperty("activationState");
    expect(metadata).not.toHaveProperty("archivedAt");
  });

  it("projects an old application execution-context superset without rewriting it", async () => {
    const store = new AgentRunMetadataStore(memoryDir);
    const metadataPath = store.getMetadataPath("run-old-context");
    await fs.mkdir(path.dirname(metadataPath), { recursive: true });
    const oldMetadata = buildMetadata({
      runId: "run-old-context",
      memoryDir: path.join(memoryDir, "agents", "run-old-context"),
      applicationExecutionContext: {
        applicationId: "app-1",
        bindingId: "binding-1",
        producer: {
          agentRunId: "run-old-context",
          displayName: "Researcher",
          runtimeKind: "AGENT_TEAM_MEMBER",
          ignoredLegacyAttribute: true,
        },
        ignoredLegacyAttribute: "unchanged-on-disk",
      },
    } as never);
    await fs.writeFile(metadataPath, JSON.stringify(oldMetadata), "utf-8");
    const beforeRead = await fs.readFile(metadataPath);

    await expect(store.readMetadata("run-old-context")).resolves.toEqual(buildMetadata({
      runId: "run-old-context",
      memoryDir: path.join(memoryDir, "agents", "run-old-context"),
      applicationExecutionContext: {
        applicationId: "app-1",
        bindingId: "binding-1",
        producer: {
          agentRunId: "run-old-context",
          displayName: "Researcher",
        },
      },
    }));
    expect(await fs.readFile(metadataPath)).toEqual(beforeRead);
  });

  it("reads and writes a delegated run's own delegatedFrom, address and launchSource exactly; a malformed delegatedFrom makes the file unreadable (contract §2.2)", async () => {
    const store = new AgentRunMetadataStore(memoryDir);
    // A local delegated run (D2): no nodeId.
    const local = { delegatingRun: { kind: "agent_team" as const, runId: "marketing_team_5a00" }, delegatorAgentRunId: "copywriter_77c1" };
    await store.writeMetadata("run-1", buildMetadata({ memoryDir: path.join(memoryDir, "agents", "run-1"), address: "/image_maker" as never,
      launchSource: { origin: "agent_default", fallbacks: [] } as never, delegatedFrom: { ...local, extra: "ignored" } as never }));
    const raw = JSON.parse(await fs.readFile(store.getMetadataPath("run-1"), "utf-8")) as Record<string, unknown>;
    expect(raw).toMatchObject({ address: "/image_maker", launchSource: { origin: "agent_default", fallbacks: [] }, delegatedFrom: local });
    const read = (await store.readMetadata("run-1"))!;
    expect(read.delegatedFrom).toEqual(local);
    expect([isDelegated(read), isPeerStarted(read), peerDelegatedFromOf(read)]).toEqual([true, false, null]);
    // A run a peer started (D7): nodeId present.
    const peer = { delegatingRun: { kind: "agent" as const, runId: "manager" }, delegatorAgentRunId: "manager", nodeId: "srv_peer_a" };
    await store.writeMetadata("run-3", buildMetadata({ runId: "run-3", memoryDir: path.join(memoryDir, "agents", "run-3"), delegatedFrom: peer }));
    const peerRun = (await store.readMetadata("run-3"))!;
    expect([isDelegated(peerRun), isPeerStarted(peerRun), peerDelegatedFromOf(peerRun)]).toEqual([true, true, peer]);
    // An old run without a recorded delegator (contract E6): only delegatingRun.
    await store.writeMetadata("run-4", buildMetadata({ runId: "run-4", memoryDir: path.join(memoryDir, "agents", "run-4"),
      delegatedFrom: { delegatingRun: { kind: "agent", runId: "manager" } } }));
    expect((await store.readMetadata("run-4"))?.delegatedFrom).toEqual({ delegatingRun: { kind: "agent", runId: "manager" } });
    // A run the user started reads without the section, and without an address (derived: "not fixed yet").
    await store.writeMetadata("run-2", buildMetadata({ runId: "run-2", memoryDir: path.join(memoryDir, "agents", "run-2") }));
    const plain = (await store.readMetadata("run-2"))!;
    expect(plain).not.toHaveProperty("delegatedFrom");
    expect(plain).not.toHaveProperty("address");
    expect([isDelegated(plain), isPeerStarted(plain)]).toEqual([false, false]);

    for (const malformed of [{ nodeId: "srv_peer_a" }, { delegatingRun: { kind: "agent", runId: "m" }, nodeId: "n" },
      { nodeId: "n", coordinatingRun: { kind: "agent", runId: "m" }, delegatorAgentRunId: "d" }]) {
      await fs.writeFile(store.getMetadataPath("run-1"), JSON.stringify({ ...raw, delegatedFrom: malformed }));
      expect((await store.readMetadataState("run-1")).kind).toBe("unreadable");
    }
  });
});
