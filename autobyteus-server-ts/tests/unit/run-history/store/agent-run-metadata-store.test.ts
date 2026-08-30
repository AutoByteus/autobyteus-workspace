import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
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
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
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
        skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
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
});
