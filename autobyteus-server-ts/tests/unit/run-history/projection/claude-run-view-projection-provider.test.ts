import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import type { ClaudeSessionManager } from "../../../../src/agent-execution/backends/claude/session/claude-session-manager.js";
import type { AgentRunMetadata } from "../../../../src/run-history/store/agent-run-metadata-types.js";
import type { RunProjectionProviderInput } from "../../../../src/run-history/projection/run-projection-types.js";

vi.mock(
  "../../../../src/agent-execution/backends/claude/session/claude-session-manager.js",
  () => ({
    ClaudeSessionManager: class {},
    getClaudeSessionManager: vi.fn(() => {
      throw new Error("getClaudeSessionManager should not be used in this unit test");
    }),
  }),
);

import { ClaudeRunViewProjectionProvider } from "../../../../src/run-history/projection/providers/claude-run-view-projection-provider.js";

const createMetadata = (
  overrides: Partial<AgentRunMetadata> = {},
): AgentRunMetadata => ({
  runId: "run-claude-1",
  agentDefinitionId: "agent-1",
  workspaceRootPath: "/tmp/workspace",
  llmModelIdentifier: "claude-sonnet",
  llmConfig: null,
  autoExecuteTools: false,
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
  platformAgentRunId: "session-1",
  lastKnownStatus: "ACTIVE",
  ...overrides,
});

const createProjectionInput = (
  overrides: Partial<AgentRunMetadata> = {},
): RunProjectionProviderInput => {
  const metadata = createMetadata(overrides);
  return {
    source: {
      runId: metadata.runId,
      runtimeKind: metadata.runtimeKind,
      workspaceRootPath: metadata.workspaceRootPath ?? null,
      memoryDir: null,
      platformRunId: metadata.platformAgentRunId ?? null,
      metadata,
    },
  };
};

describe("ClaudeRunViewProjectionProvider", () => {
  it("uses platformAgentRunId as the Claude session id", async () => {
    const sessionManager: ClaudeSessionManager = {
      getSessionMessages: vi.fn(async () => [
        { role: "user", content: "hello", ts: 1 },
        { role: "assistant", content: "hi there", ts: 2 },
      ]),
    } as unknown as ClaudeSessionManager;
    const provider = new ClaudeRunViewProjectionProvider(sessionManager);

    const projection = await provider.buildProjection(
      createProjectionInput({ platformAgentRunId: "session-abc" }),
    );

    expect(sessionManager.getSessionMessages).toHaveBeenCalledWith("session-abc");
    expect(projection?.conversation).toHaveLength(2);
    expect(projection?.conversation[0]?.role).toBe("user");
    expect(projection?.conversation[1]?.role).toBe("assistant");
  });

  it("falls back to runId when no persisted session id exists", async () => {
    const sessionManager: ClaudeSessionManager = {
      getSessionMessages: vi.fn(async () => [{ role: "assistant", content: "hello", ts: 2 }]),
    } as unknown as ClaudeSessionManager;
    const provider = new ClaudeRunViewProjectionProvider(sessionManager);

    const projection = await provider.buildProjection(
      createProjectionInput({
        runId: "run-claude-fallback",
        platformAgentRunId: null,
      }),
    );

    expect(sessionManager.getSessionMessages).toHaveBeenCalledWith("run-claude-fallback");
    expect(projection?.runId).toBe("run-claude-fallback");
  });
});
