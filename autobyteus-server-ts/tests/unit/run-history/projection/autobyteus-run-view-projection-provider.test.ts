import { describe, expect, it, vi } from "vitest";
import { AutoByteusRunViewProjectionProvider } from "../../../../src/run-history/projection/providers/autobyteus-run-view-projection-provider.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import type { AgentRunMetadata } from "../../../../src/run-history/store/agent-run-metadata-types.js";

const createMetadata = (
  overrides: Partial<AgentRunMetadata> = {},
): AgentRunMetadata => ({
  runId: "server-run-1",
  agentDefinitionId: "agent-def-1",
  workspaceRootPath: "/tmp/workspace",
  llmModelIdentifier: "model-1",
  llmConfig: null,
  autoExecuteTools: true,
  skillAccessMode: null,
  runtimeKind: RuntimeKind.AUTOBYTEUS,
  platformAgentRunId: "native-agent-1",
  lastKnownStatus: "IDLE",
  ...overrides,
});

describe("AutoByteusRunViewProjectionProvider", () => {
  it("uses platformAgentRunId as the runtime memory directory when available", async () => {
    const getRunMemoryView = vi.fn().mockReturnValue({
      conversation: [
        { kind: "message", role: "user", content: "hello", ts: 1 },
        { kind: "message", role: "assistant", content: "world", ts: 2 },
      ],
    });
    const provider = new AutoByteusRunViewProjectionProvider("/tmp/memory", {
      getRunMemoryView,
    } as never);

    const projection = await provider.buildProjection({
      source: {
        runId: "server-run-1",
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        workspaceRootPath: "/tmp/workspace",
        memoryDir: null,
        platformRunId: "native-agent-abc",
        metadata: createMetadata({ platformAgentRunId: "native-agent-abc" }),
      },
    });

    expect(getRunMemoryView).toHaveBeenCalledWith("native-agent-abc", {
      includeWorkingContext: false,
      includeEpisodic: false,
      includeSemantic: false,
      includeConversation: true,
      includeRawTraces: false,
      includeArchive: true,
    });
    expect(projection.runId).toBe("server-run-1");
    expect(projection.conversation).toHaveLength(2);
  });

  it("falls back to the server runId when platformAgentRunId is missing", async () => {
    const getRunMemoryView = vi.fn().mockReturnValue({
      conversation: [],
    });
    const provider = new AutoByteusRunViewProjectionProvider("/tmp/memory", {
      getRunMemoryView,
    } as never);

    await provider.buildProjection({
      source: {
        runId: "server-run-2",
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        workspaceRootPath: "/tmp/workspace",
        memoryDir: null,
        platformRunId: null,
        metadata: createMetadata({ platformAgentRunId: null }),
      },
    });

    expect(getRunMemoryView).toHaveBeenCalledWith("server-run-2", {
      includeWorkingContext: false,
      includeEpisodic: false,
      includeSemantic: false,
      includeConversation: true,
      includeRawTraces: false,
      includeArchive: true,
    });
  });
});
