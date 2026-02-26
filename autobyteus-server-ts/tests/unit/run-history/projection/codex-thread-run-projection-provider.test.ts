import os from "node:os";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { CodexThreadRunProjectionProvider } from "../../../../src/run-history/projection/providers/codex-thread-run-projection-provider.js";
import type { CodexThreadHistoryReader } from "../../../../src/runtime-execution/codex-app-server/codex-thread-history-reader.js";

describe("CodexThreadRunProjectionProvider", () => {
  it("returns null when thread id is missing", async () => {
    const reader: CodexThreadHistoryReader = {
      readThread: vi.fn(async () => null),
    } as unknown as CodexThreadHistoryReader;
    const provider = new CodexThreadRunProjectionProvider(reader);

    const projection = await provider.buildProjection({
      runId: "run-1",
      runtimeKind: "codex_app_server",
      manifest: null,
      runtimeReference: {
        runtimeKind: "codex_app_server",
        sessionId: "session-1",
        threadId: null,
        metadata: null,
      },
    });

    expect(projection).toBeNull();
    expect(reader.readThread).not.toHaveBeenCalled();
  });

  it("transforms codex thread turns/items into canonical projection conversation entries", async () => {
    const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "codex-projection-unit-"));
    const reader: CodexThreadHistoryReader = {
      readThread: vi.fn(async () => ({
        thread: {
          id: "thread-1",
          turns: [
            {
              id: "turn-1",
              ts: 1_700_000_000,
              input: [{ type: "text", text: "hello codex" }],
              items: [
                { method: "item/outputText/delta", delta: "hi there" },
                {
                  method: "item/commandExecution/completed",
                  toolName: "run_bash",
                  arguments: { cmd: "ls -la" },
                  result: "ok",
                },
              ],
            },
          ],
        },
      })),
    } as unknown as CodexThreadHistoryReader;
    const provider = new CodexThreadRunProjectionProvider(reader);
    try {
      const projection = await provider.buildProjection({
        runId: "run-codex-1",
        runtimeKind: "codex_app_server",
        manifest: {
          agentDefinitionId: "agent-1",
          workspaceRootPath,
          llmModelIdentifier: "gpt-5.2-codex",
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
        },
        runtimeReference: {
          runtimeKind: "codex_app_server",
          sessionId: "session-1",
          threadId: "thread-1",
          metadata: null,
        },
      });

      expect(reader.readThread).toHaveBeenCalledWith("thread-1", workspaceRootPath);
      expect(projection).not.toBeNull();
      expect(projection?.runId).toBe("run-codex-1");
      expect(projection?.conversation.some((entry) => entry.role === "user" && entry.content?.includes("hello codex"))).toBe(true);
      expect(
        projection?.conversation.some((entry) => entry.kind === "message" && entry.role === "assistant" && entry.content?.includes("hi there")),
      ).toBe(true);
      expect(
        projection?.conversation.some((entry) => entry.kind === "tool_call" && entry.toolName === "run_bash"),
      ).toBe(true);
    } finally {
      await rm(workspaceRootPath, { recursive: true, force: true });
    }
  });

  it("transforms current codex thread item schema into canonical conversation entries", async () => {
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
    const provider = new CodexThreadRunProjectionProvider(reader);
    try {
      const projection = await provider.buildProjection({
        runId: "run-codex-2",
        runtimeKind: "codex_app_server",
        manifest: {
          agentDefinitionId: "agent-2",
          workspaceRootPath,
          llmModelIdentifier: "gpt-5.3-codex",
          llmConfig: null,
          autoExecuteTools: false,
          skillAccessMode: null,
          runtimeKind: "codex_app_server",
          runtimeReference: {
            runtimeKind: "codex_app_server",
            sessionId: "session-2",
            threadId: "thread-2",
            metadata: null,
          },
        },
        runtimeReference: {
          runtimeKind: "codex_app_server",
          sessionId: "session-2",
          threadId: "thread-2",
          metadata: null,
        },
      });

      expect(reader.readThread).toHaveBeenCalledWith("thread-2", workspaceRootPath);
      expect(projection).not.toBeNull();
      expect(
        projection?.conversation.some(
          (entry) => entry.kind === "message" && entry.role === "user" && entry.content?.includes("create fibonacci in python"),
        ),
      ).toBe(true);
      expect(
        projection?.conversation.some(
          (entry) =>
            entry.kind === "message" &&
            entry.role === "assistant" &&
            entry.content?.includes("I will create the file and run it.") &&
            entry.content?.includes("[reasoning]"),
        ),
      ).toBe(true);
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
    const provider = new CodexThreadRunProjectionProvider(reader);
    const missingWorkspacePath = `/tmp/non-existent-codex-workspace-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const projection = await provider.buildProjection({
      runId: "run-codex-3",
      runtimeKind: "codex_app_server",
      manifest: {
        agentDefinitionId: "agent-3",
        workspaceRootPath: missingWorkspacePath,
        llmModelIdentifier: "gpt-5.3-codex",
        llmConfig: null,
        autoExecuteTools: false,
        skillAccessMode: null,
        runtimeKind: "codex_app_server",
        runtimeReference: {
          runtimeKind: "codex_app_server",
          sessionId: "session-3",
          threadId: "thread-3",
          metadata: null,
        },
      },
      runtimeReference: {
        runtimeKind: "codex_app_server",
        sessionId: "session-3",
        threadId: "thread-3",
        metadata: null,
      },
    });

    expect(reader.readThread).toHaveBeenCalledWith("thread-3", process.cwd());
    expect(projection).not.toBeNull();
    expect(
      projection?.conversation.some(
        (entry) => entry.kind === "message" && entry.role === "assistant" && entry.content?.includes("hi"),
      ),
    ).toBe(true);
  });
});
