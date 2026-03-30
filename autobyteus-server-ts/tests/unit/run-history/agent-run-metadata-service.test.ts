import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";
import { AgentRunMetadataService } from "../../../src/run-history/services/agent-run-metadata-service.js";

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

describe("AgentRunMetadataService", () => {
  it("delegates metadata reads to the metadata store", async () => {
    const readMetadata = vi.fn().mockResolvedValue(buildMetadata());
    const service = new AgentRunMetadataService("/tmp/memory", {
      metadataStore: {
        readMetadata,
        writeMetadata: vi.fn(),
      },
    });

    const result = await service.readMetadata("run-1");

    expect(readMetadata).toHaveBeenCalledWith("run-1");
    expect(result?.runId).toBe("run-1");
  });

  it("delegates metadata writes to the metadata store", async () => {
    const writeMetadata = vi.fn().mockResolvedValue(undefined);
    const metadata = buildMetadata({ lastKnownStatus: "TERMINATED" });
    const service = new AgentRunMetadataService("/tmp/memory", {
      metadataStore: {
        readMetadata: vi.fn(),
        writeMetadata,
      },
    });

    await service.writeMetadata("run-1", metadata);

    expect(writeMetadata).toHaveBeenCalledWith("run-1", metadata);
  });
});
