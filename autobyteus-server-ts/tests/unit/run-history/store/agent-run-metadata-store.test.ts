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
  llmModelIdentifier: "model-1",
  llmConfig: null,
  autoExecuteTools: false,
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  platformAgentRunId: "thread-1",
  lastKnownStatus: "IDLE",
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

  it("round-trips persisted metadata including lastKnownStatus", async () => {
    const store = new AgentRunMetadataStore(memoryDir);
    await store.writeMetadata("run-1", buildMetadata({
      workspaceRootPath: "/tmp/workspace/",
      platformAgentRunId: "  thread-1  ",
      lastKnownStatus: "TERMINATED",
    }));

    const metadata = await store.readMetadata("run-1");

    expect(metadata).toEqual(buildMetadata({
      workspaceRootPath: "/tmp/workspace",
      platformAgentRunId: "thread-1",
      lastKnownStatus: "TERMINATED",
    }));
  });

  it("defaults missing lastKnownStatus to IDLE for older metadata files", async () => {
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
      }),
      "utf-8",
    );

    const metadata = await store.readMetadata("run-legacy");

    expect(metadata?.lastKnownStatus).toBe("IDLE");
  });
});
