import os from "node:os";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import type { AgentRunMetadata } from "../../../../src/run-history/store/agent-run-metadata-types.js";
import type { RunProjectionProviderInput } from "../../../../src/run-history/projection/run-projection-types.js";

vi.mock(
  "../../../../src/agent-execution/backends/codex/history/codex-thread-history-reader.js",
  () => ({
    CodexThreadHistoryReader: class {},
    getCodexThreadHistoryReader: vi.fn(() => {
      throw new Error("getCodexThreadHistoryReader should not be used in this unit test");
    }),
  }),
);

import { CodexRunViewProjectionProvider } from "../../../../src/run-history/projection/providers/codex-run-view-projection-provider.js";
import type { CodexThreadHistoryReader } from "../../../../src/agent-execution/backends/codex/history/codex-thread-history-reader.js";

const createMetadata = (
  overrides: Partial<AgentRunMetadata> = {},
): AgentRunMetadata => ({
  runId: "run-1",
  agentDefinitionId: "agent-1",
  workspaceRootPath: "/tmp/workspace",
  llmModelIdentifier: "gpt-5.3-codex",
  llmConfig: null,
  autoExecuteTools: false,
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  platformAgentRunId: "thread-1",
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
      workspaceRootPath: metadata.workspaceRootPath,
      memoryDir: null,
      platformRunId: metadata.platformAgentRunId,
      metadata,
    },
  };
};

describe("CodexRunViewProjectionProvider", () => {
  it("returns null when thread id is missing", async () => {
    const reader: CodexThreadHistoryReader = {
      readThread: vi.fn(async () => null),
    } as unknown as CodexThreadHistoryReader;
    const provider = new CodexRunViewProjectionProvider(reader);

    const projection = await provider.buildProjection(
      createProjectionInput({ platformAgentRunId: null }),
    );

    expect(projection).toBeNull();
    expect(reader.readThread).not.toHaveBeenCalled();
  });

  it("transforms current codex file-change thread items into canonical projection conversation entries", async () => {
    const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "codex-projection-unit-"));
    const reader: CodexThreadHistoryReader = {
      readThread: vi.fn(async () => ({
        thread: {
          id: "thread-1",
          turns: [
            {
              id: "turn-1",
              items: [
                {
                  type: "userMessage",
                  id: "item-1",
                  content: [{ type: "text", text: "hello codex" }],
                },
                {
                  type: "agentMessage",
                  id: "item-2",
                  text: "hi there",
                },
                {
                  type: "fileChange",
                  id: "call-1",
                  status: "completed",
                  changes: [
                    {
                      path: "/tmp/workspace/hello.txt",
                      kind: { type: "add" },
                      diff: "hello\n",
                    },
                  ],
                },
              ],
            },
          ],
        },
      })),
    } as unknown as CodexThreadHistoryReader;
    const provider = new CodexRunViewProjectionProvider(reader);
    try {
      const projection = await provider.buildProjection(
        createProjectionInput({
          runId: "run-codex-1",
          workspaceRootPath,
          llmModelIdentifier: "gpt-5.2-codex",
          platformAgentRunId: "thread-1",
        }),
      );

      expect(reader.readThread).toHaveBeenCalledWith("thread-1", workspaceRootPath);
      expect(projection).not.toBeNull();
      expect(projection?.runId).toBe("run-codex-1");
      expect(projection?.conversation.some((entry) => entry.role === "user" && entry.content?.includes("hello codex"))).toBe(true);
      expect(
        projection?.conversation.some((entry) => entry.kind === "message" && entry.role === "assistant" && entry.content?.includes("hi there")),
      ).toBe(true);
      expect(
        projection?.conversation.some(
          (entry) =>
            entry.kind === "tool_call" &&
            entry.toolName === "edit_file" &&
            entry.toolArgs?.path === "/tmp/workspace/hello.txt" &&
            entry.toolArgs?.patch === "hello\n",
        ),
      ).toBe(true);
    } finally {
      await rm(workspaceRootPath, { recursive: true, force: true });
    }
  });

  it("transforms current codex reasoning and agent message items into canonical conversation entries", async () => {
    const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "codex-projection-unit-"));
    const reader: CodexThreadHistoryReader = {
      readThread: vi.fn(async () => ({
        thread: {
          id: "thread-2",
          turns: [
            {
              id: "turn-1",
              items: [
                {
                  type: "userMessage",
                  id: "item-1",
                  content: [{ type: "text", text: "create fibonacci in python" }],
                },
                {
                  type: "reasoning",
                  id: "item-2",
                  summary: ["**Planning file creation and execution**"],
                  content: [],
                },
                {
                  type: "agentMessage",
                  id: "item-3",
                  text: "I will create the file and run it.",
                },
              ],
            },
          ],
        },
      })),
    } as unknown as CodexThreadHistoryReader;
    const provider = new CodexRunViewProjectionProvider(reader);
    try {
      const projection = await provider.buildProjection(
        createProjectionInput({
          runId: "run-codex-2",
          agentDefinitionId: "agent-2",
          workspaceRootPath,
          platformAgentRunId: "thread-2",
        }),
      );

      expect(reader.readThread).toHaveBeenCalledWith("thread-2", workspaceRootPath);
      expect(projection).not.toBeNull();
      expect(
        projection?.conversation.some(
          (entry) => entry.kind === "message" && entry.role === "user" && entry.content?.includes("create fibonacci in python"),
        ),
      ).toBe(true);
      expect(
        projection?.conversation,
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: "reasoning",
            content: "**Planning file creation and execution**",
          }),
          expect.objectContaining({
            kind: "message",
            role: "assistant",
            content: "I will create the file and run it.",
          }),
        ]),
      );
      const reasoningIndex =
        projection?.conversation.findIndex((entry) => entry.kind === "reasoning") ?? -1;
      const assistantIndex =
        projection?.conversation.findIndex(
          (entry) => entry.kind === "message" && entry.role === "assistant",
        ) ?? -1;
      expect(reasoningIndex).toBeGreaterThanOrEqual(0);
      expect(assistantIndex).toBeGreaterThan(reasoningIndex);
    } finally {
      await rm(workspaceRootPath, { recursive: true, force: true });
    }
  });

  it("transforms current codex command execution and web search items into canonical tool entries", async () => {
    const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "codex-projection-unit-"));
    const reader: CodexThreadHistoryReader = {
      readThread: vi.fn(async () => ({
        thread: {
          id: "thread-4",
          turns: [
            {
              id: "turn-1",
              items: [
                {
                  type: "userMessage",
                  id: "item-1",
                  content: [{ type: "text", text: "search and run" }],
                },
                {
                  type: "commandExecution",
                  id: "call-1",
                  command: "/bin/bash -lc pwd",
                  status: "completed",
                  aggregatedOutput: "/tmp/workspace\n",
                  exitCode: 0,
                },
                {
                  type: "webSearch",
                  id: "ws-1",
                  query: "Elon Musk latest news",
                  action: {
                    type: "search",
                    query: "Elon Musk latest news",
                    queries: ["Elon Musk latest news", "Elon Musk Reuters latest"],
                  },
                },
                {
                  type: "agentMessage",
                  id: "item-2",
                  text: "DONE",
                },
              ],
            },
          ],
        },
      })),
    } as unknown as CodexThreadHistoryReader;
    const provider = new CodexRunViewProjectionProvider(reader);
    try {
      const projection = await provider.buildProjection(
        createProjectionInput({
          runId: "run-codex-4",
          workspaceRootPath,
          platformAgentRunId: "thread-4",
        }),
      );

      expect(projection).not.toBeNull();
      expect(
        projection?.conversation.some(
          (entry) =>
            entry.kind === "tool_call" &&
            entry.toolName === "run_bash" &&
            entry.toolArgs?.command === "/bin/bash -lc pwd" &&
            (entry.toolResult as Record<string, unknown>)?.output === "/tmp/workspace\n",
        ),
      ).toBe(true);
      expect(
        projection?.conversation.some(
          (entry) =>
            entry.kind === "tool_call" &&
            entry.toolName === "search_web" &&
            entry.toolArgs?.query === "Elon Musk latest news" &&
            Array.isArray(entry.toolArgs?.queries),
        ),
      ).toBe(true);
      expect(projection?.activities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            invocationId: "call-1",
            toolName: "run_bash",
            type: "terminal_command",
            status: "success",
            detailLevel: "source_limited",
          }),
          expect.objectContaining({
            invocationId: "ws-1",
            toolName: "search_web",
            type: "tool_call",
            status: "success",
            detailLevel: "source_limited",
          }),
        ]),
      );
    } finally {
      await rm(workspaceRootPath, { recursive: true, force: true });
    }
  });

  it("preserves failed command execution output and exit-code diagnostics", async () => {
    const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "codex-projection-unit-"));
    const reader: CodexThreadHistoryReader = {
      readThread: vi.fn(async () => ({
        thread: {
          id: "thread-failed-command",
          turns: [
            {
              id: "turn-1",
              items: [
                {
                  type: "commandExecution",
                  id: "call-failed-command",
                  command: "/bin/bash -lc 'exit 1'",
                  status: "failed",
                  aggregatedOutput: "boom\n",
                  exitCode: 1,
                },
              ],
            },
          ],
        },
      })),
    } as unknown as CodexThreadHistoryReader;
    const provider = new CodexRunViewProjectionProvider(reader);
    try {
      const projection = await provider.buildProjection(
        createProjectionInput({
          runId: "run-codex-failed-command",
          workspaceRootPath,
          platformAgentRunId: "thread-failed-command",
        }),
      );

      expect(projection).not.toBeNull();
      expect(projection?.conversation).toEqual([
        expect.objectContaining({
          kind: "tool_call",
          invocationId: "call-failed-command",
          toolName: "run_bash",
          toolArgs: { command: "/bin/bash -lc 'exit 1'" },
          toolResult: {
            status: "failed",
            output: "boom\n",
            exit_code: 1,
          },
          toolError: "Tool execution failed.",
        }),
      ]);
      expect(projection?.activities).toEqual([
        expect.objectContaining({
          invocationId: "call-failed-command",
          toolName: "run_bash",
          type: "terminal_command",
          status: "error",
          result: {
            status: "failed",
            output: "boom\n",
            exit_code: 1,
          },
          error: "Tool execution failed.",
        }),
      ]);
    } finally {
      await rm(workspaceRootPath, { recursive: true, force: true });
    }
  });

  it("preserves dynamic and MCP tool calls from codex thread history in transcript order", async () => {
    const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "codex-projection-unit-"));
    const reader: CodexThreadHistoryReader = {
      readThread: vi.fn(async () => ({
        thread: {
          id: "thread-dynamic-tools",
          turns: [
            {
              id: "turn-1",
              createdAt: "2026-05-16T08:00:00.000Z",
              items: [
                {
                  type: "userMessage",
                  id: "item-user",
                  content: [{ type: "text", text: "run shell and send a message" }],
                },
                {
                  type: "reasoning",
                  id: "item-reasoning",
                  summary: ["I will inspect the workspace and send the handoff."],
                },
                {
                  type: "mcpToolCall",
                  id: "call-shell-1",
                  name: "functions.exec_command",
                  arguments: { cmd: "pwd", workdir: "/tmp/workspace" },
                  contentItems: [
                    {
                      type: "inputText",
                      text: JSON.stringify({ stdout: "/tmp/workspace\n", exit_code: 0 }),
                    },
                  ],
                  status: "completed",
                },
                {
                  type: "dynamicToolCall",
                  id: "call-send-1",
                  tool: "send_message_to",
                  arguments: {
                    recipient_name: "code_reviewer",
                    content: "Implementation handoff is ready.",
                  },
                  result: { success: true },
                  status: "completed",
                },
                {
                  type: "agentMessage",
                  id: "item-assistant",
                  text: "Done.",
                },
              ],
            },
          ],
        },
      })),
    } as unknown as CodexThreadHistoryReader;
    const provider = new CodexRunViewProjectionProvider(reader);
    try {
      const projection = await provider.buildProjection(
        createProjectionInput({
          runId: "run-codex-dynamic-tools",
          workspaceRootPath,
          platformAgentRunId: "thread-dynamic-tools",
        }),
      );

      expect(projection).not.toBeNull();
      expect(projection?.conversation.map((entry) => entry.kind)).toEqual([
        "message",
        "reasoning",
        "tool_call",
        "tool_call",
        "message",
      ]);
      const toolCalls = projection?.conversation.filter((entry) => entry.kind === "tool_call") ?? [];
      expect(toolCalls.map((entry) => entry.toolName)).toEqual([
        "functions.exec_command",
        "send_message_to",
      ]);
      expect(toolCalls[0]).toMatchObject({
        invocationId: "call-shell-1",
        toolArgs: { cmd: "pwd", workdir: "/tmp/workspace" },
        toolResult: { stdout: "/tmp/workspace\n", exit_code: 0 },
      });
      expect(toolCalls[1]).toMatchObject({
        invocationId: "call-send-1",
        toolArgs: {
          recipient_name: "code_reviewer",
          content: "Implementation handoff is ready.",
        },
        toolResult: { success: true },
      });
      expect(projection?.activities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            invocationId: "call-shell-1",
            toolName: "functions.exec_command",
            type: "tool_call",
            status: "success",
            arguments: { cmd: "pwd", workdir: "/tmp/workspace" },
            result: { stdout: "/tmp/workspace\n", exit_code: 0 },
          }),
          expect.objectContaining({
            invocationId: "call-send-1",
            toolName: "send_message_to",
            type: "tool_call",
            status: "success",
            arguments: {
              recipient_name: "code_reviewer",
              content: "Implementation handoff is ready.",
            },
            result: { success: true },
          }),
        ]),
      );
    } finally {
      await rm(workspaceRootPath, { recursive: true, force: true });
    }
  });

  it("extracts failed MCP and dynamic tool errors from nested result content", async () => {
    const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "codex-projection-unit-"));
    const reader: CodexThreadHistoryReader = {
      readThread: vi.fn(async () => ({
        thread: {
          id: "thread-failed-dynamic-tools",
          turns: [
            {
              id: "turn-1",
              items: [
                {
                  type: "mcpToolCall",
                  id: "call-tts-failed",
                  server: "tts",
                  tool: "speak",
                  arguments: { text: "hello" },
                  status: "failed",
                  result: {
                    content: [
                      {
                        type: "text",
                        text: "Error executing tool speak: timeout",
                      },
                    ],
                    structuredContent: { code: "ETIMEDOUT" },
                  },
                },
                {
                  type: "dynamicToolCall",
                  id: "call-send-failed",
                  tool: "send_message_to",
                  arguments: { recipient_name: "missing", content: "hello" },
                  status: "failed",
                  result: {
                    content: [
                      {
                        type: "text",
                        text: "Recipient missing was not found.",
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      })),
    } as unknown as CodexThreadHistoryReader;
    const provider = new CodexRunViewProjectionProvider(reader);
    try {
      const projection = await provider.buildProjection(
        createProjectionInput({
          runId: "run-codex-failed-dynamic-tools",
          workspaceRootPath,
          platformAgentRunId: "thread-failed-dynamic-tools",
        }),
      );

      expect(projection).not.toBeNull();
      expect(projection?.conversation).toEqual([
        expect.objectContaining({
          kind: "tool_call",
          invocationId: "call-tts-failed",
          toolName: "tts.speak",
          toolArgs: { text: "hello" },
          toolResult: {
            content: [
              {
                type: "text",
                text: "Error executing tool speak: timeout",
              },
            ],
            structuredContent: { code: "ETIMEDOUT" },
          },
          toolError: "Error executing tool speak: timeout",
        }),
        expect.objectContaining({
          kind: "tool_call",
          invocationId: "call-send-failed",
          toolName: "send_message_to",
          toolArgs: { recipient_name: "missing", content: "hello" },
          toolError: "Recipient missing was not found.",
        }),
      ]);
      expect(projection?.activities).toEqual([
        expect.objectContaining({
          invocationId: "call-tts-failed",
          status: "error",
          error: "Error executing tool speak: timeout",
        }),
        expect.objectContaining({
          invocationId: "call-send-failed",
          status: "error",
          error: "Recipient missing was not found.",
        }),
      ]);
    } finally {
      await rm(workspaceRootPath, { recursive: true, force: true });
    }
  });

  it("falls back to process cwd when manifest workspace path does not exist", async () => {
    const reader: CodexThreadHistoryReader = {
      readThread: vi.fn(async () => ({
        thread: {
          id: "thread-3",
          turns: [
            {
              id: "turn-1",
              items: [
                {
                  type: "userMessage",
                  content: [{ type: "text", text: "hello" }],
                },
                {
                  type: "agentMessage",
                  text: "hi",
                },
              ],
            },
          ],
        },
      })),
    } as unknown as CodexThreadHistoryReader;
    const provider = new CodexRunViewProjectionProvider(reader);
    const missingWorkspacePath = `/tmp/non-existent-codex-workspace-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const projection = await provider.buildProjection(
      createProjectionInput({
        runId: "run-codex-3",
        agentDefinitionId: "agent-3",
        workspaceRootPath: missingWorkspacePath,
        platformAgentRunId: "thread-3",
      }),
    );

    expect(reader.readThread).toHaveBeenCalledWith("thread-3", process.cwd());
    expect(projection).not.toBeNull();
    expect(
      projection?.conversation.some(
        (entry) => entry.kind === "message" && entry.role === "assistant" && entry.content?.includes("hi"),
      ),
    ).toBe(true);
  });
});
