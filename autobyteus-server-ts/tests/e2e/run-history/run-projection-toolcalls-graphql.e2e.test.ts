import "reflect-metadata";
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RAW_TRACES_ACTIVE_MEMORY_FILE_NAME } from "autobyteus-ts/memory/store/memory-file-names.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRunMetadataStore } from "../../../src/run-history/store/agent-run-metadata-store.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";
import { TeamRunMetadataStore } from "../../../src/run-history/store/team-run-metadata-store.js";
import type { TeamRunMetadata } from "../../../src/run-history/store/team-run-metadata-types.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { RuntimeMemoryEventAccumulator } from "../../../src/agent-memory/services/runtime-memory-event-accumulator.js";
import { RunMemoryWriter } from "../../../src/agent-memory/store/run-memory-writer.js";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../src/agent-execution/domain/agent-run-event.js";
import { CodexThreadEventConverter } from "../../../src/agent-execution/backends/codex/events/codex-thread-event-converter.js";
import { CodexThreadEventName } from "../../../src/agent-execution/backends/codex/events/codex-thread-event-name.js";

const { readThreadMock } = vi.hoisted(() => ({
  readThreadMock: vi.fn(),
}));

vi.mock("../../../src/agent-execution/backends/codex/history/codex-thread-history-reader.js", () => ({
  CodexThreadHistoryReader: class {},
  getCodexThreadHistoryReader: () => ({
    readThread: readThreadMock,
  }),
}));

import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";

const STANDALONE_RUN_ID = "run-codex-toolcalls-graphql";
const STANDALONE_THREAD_ID = "thread-standalone-toolcalls";
const TEAM_RUN_ID = "team-codex-toolcalls-graphql";
const MEMBER_RUN_ID = "member-codex-toolcalls-graphql";
const MEMBER_THREAD_ID = "thread-member-toolcalls";
const USER_TS = 1_710_000_000;
const REASONING_TS = 1_710_000_000.5;
const TOOL_TS = 1_710_000_001;
const ASSISTANT_TS = 1_710_000_002;
const LOCAL_REPLAY_MARKER = "LOCAL_REPLAY_IS_CODEX_UI_PROJECTION_SOURCE";
const NATIVE_THREAD_MARKER = "NATIVE_THREAD_SHOULD_NOT_RECOVER_UI_PROJECTION";

type ProjectionPayload = {
  summary: string | null;
  lastActivityAt: string | null;
  conversation: Array<Record<string, unknown>>;
  activities: Array<Record<string, unknown>>;
};

const findToolRow = (
  rows: Array<Record<string, unknown>>,
  invocationId: string,
): Record<string, unknown> | undefined =>
  rows.find((row) => row.invocationId === invocationId);

const findReasoningRow = (
  rows: Array<Record<string, unknown>>,
  content: string,
): Record<string, unknown> | undefined =>
  rows.find((row) => row.kind === "reasoning" && row.content === content);

let eventTimestampCounter = 1_720_000_000;
const nextEventTimestamp = (): number => {
  eventTimestampCounter += 0.001;
  return eventTimestampCounter;
};

const event = (
  runId: string,
  eventType: AgentRunEventType,
  payload: Record<string, unknown>,
): AgentRunEvent => ({
  eventType,
  runId,
  payload: {
    ts: nextEventTimestamp(),
    ...payload,
  },
  statusHint: null,
});

const writeLocalReplayToolTrace = async (
  runDir: string,
  input: {
    userText: string;
    dynamicInvocationId: string;
    dynamicArgs: Record<string, unknown>;
  },
): Promise<void> => {
  await fs.mkdir(runDir, { recursive: true });
  await fs.writeFile(
    path.join(runDir, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME),
    [
      {
        trace_type: "user",
        content: input.userText,
        turn_id: "turn-1",
        seq: 1,
        ts: USER_TS,
      },
      {
        trace_type: "reasoning",
        content: "Preparing tool calls from local replay traces.",
        turn_id: "turn-1",
        seq: 2,
        ts: REASONING_TS,
      },
      {
        trace_type: "tool_call",
        tool_call_id: "mcp-call-1",
        tool_name: "functions.exec_command",
        tool_args: { cmd: "echo graphql-api-validation" },
        turn_id: "turn-1",
        seq: 3,
        ts: TOOL_TS,
      },
      {
        trace_type: "tool_result",
        tool_call_id: "mcp-call-1",
        tool_name: "functions.exec_command",
        tool_args: { cmd: "echo graphql-api-validation" },
        tool_result: { stdout: "graphql-api-validation\n", exit_code: 0 },
        turn_id: "turn-1",
        seq: 4,
        ts: TOOL_TS + 0.1,
      },
      {
        trace_type: "tool_call",
        tool_call_id: input.dynamicInvocationId,
        tool_name: "send_message_to",
        tool_args: input.dynamicArgs,
        turn_id: "turn-1",
        seq: 5,
        ts: TOOL_TS + 0.2,
      },
      {
        trace_type: "tool_result",
        tool_call_id: input.dynamicInvocationId,
        tool_result: { delivered: true },
        tool_error: null,
        turn_id: "turn-1",
        seq: 6,
        ts: TOOL_TS + 0.3,
      },
      {
        trace_type: "assistant",
        content: LOCAL_REPLAY_MARKER,
        turn_id: "turn-1",
        seq: 7,
        ts: ASSISTANT_TS,
      },
    ].map((row) => JSON.stringify(row)).join("\n") + "\n",
    "utf-8",
  );
};

describe("Run projection tool-call GraphQL e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let testDataDir: string;
  let workspaceRootPath: string;
  let memoryDir: string;

  beforeAll(async () => {
    testDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "run-projection-toolcalls-gql-"));
    await fs.writeFile(
      path.join(testDataDir, ".env"),
      "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n",
      "utf-8",
    );
    workspaceRootPath = await fs.mkdtemp(path.join(os.tmpdir(), "run-projection-workspace-"));
    appConfigProvider.config.setCustomAppDataDir(testDataDir);
    memoryDir = appConfigProvider.config.getMemoryDir();
    schema = await buildGraphqlSchema();

    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  beforeEach(async () => {
    eventTimestampCounter = 1_720_000_000;
    readThreadMock.mockReset();
    readThreadMock.mockResolvedValue({
      thread: {
        id: "native-thread-that-must-not-be-read",
        turns: [
          {
            id: "native-turn",
            items: [
              {
                type: "agentMessage",
                id: "native-message",
                text: NATIVE_THREAD_MARKER,
              },
            ],
          },
        ],
      },
    });
    await fs.rm(memoryDir, { recursive: true, force: true });
    await fs.mkdir(memoryDir, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(workspaceRootPath, { recursive: true, force: true });
    await fs.rm(testDataDir, { recursive: true, force: true });
  });

  const execGraphql = async <T>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> => {
    const result = await graphql({
      schema,
      source: query,
      variableValues: variables,
    });
    if (result.errors?.length) {
      throw result.errors[0];
    }
    return result.data as T;
  };

  it("serves local replay dynamic and MCP Codex tool rows through getRunProjection", async () => {
    const metadataStore = new AgentRunMetadataStore(memoryDir);
    const runDir = path.join(memoryDir, "agents", STANDALONE_RUN_ID);
    await metadataStore.writeMetadata(STANDALONE_RUN_ID, {
      runId: STANDALONE_RUN_ID,
      agentDefinitionId: "agent-codex-toolcalls",
      workspaceRootPath,
      memoryDir: runDir,
      llmModelIdentifier: "gpt-5.2-codex",
      llmConfig: null,
      autoExecuteTools: false,
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      platformAgentRunId: STANDALONE_THREAD_ID,
    } satisfies AgentRunMetadata);
    await writeLocalReplayToolTrace(runDir, {
      userText: "Run GraphQL standalone projection validation.",
      dynamicInvocationId: "dynamic-send-1",
      dynamicArgs: {
        recipient_name: "code_reviewer",
        content: "standalone projection validation",
      },
    });

    const result = await execGraphql<{ getRunProjection: ProjectionPayload }>(
      `
        query RunProjection($runId: String!) {
          getRunProjection(runId: $runId) {
            runId
            summary
            lastActivityAt
            conversation
            activities
          }
        }
      `,
      { runId: STANDALONE_RUN_ID },
    );

    const projection = result.getRunProjection;
    const dynamicConversation = findToolRow(projection.conversation, "dynamic-send-1");
    const dynamicActivity = findToolRow(projection.activities, "dynamic-send-1");
    const mcpConversation = findToolRow(projection.conversation, "mcp-call-1");
    const mcpActivity = findToolRow(projection.activities, "mcp-call-1");
    const serializedConversation = JSON.stringify(projection.conversation);

    expect(readThreadMock).not.toHaveBeenCalled();
    expect(serializedConversation).toContain(LOCAL_REPLAY_MARKER);
    expect(dynamicConversation).toMatchObject({
      kind: "tool_call",
      toolName: "send_message_to",
      toolArgs: {
        recipient_name: "code_reviewer",
        content: "standalone projection validation",
      },
      toolResult: { delivered: true },
    });
    expect(dynamicActivity).toMatchObject({
      toolName: "send_message_to",
      status: "success",
      arguments: {
        recipient_name: "code_reviewer",
        content: "standalone projection validation",
      },
      result: { delivered: true },
    });
    expect(mcpConversation).toMatchObject({
      kind: "tool_call",
      toolName: "functions.exec_command",
      toolArgs: { cmd: "echo graphql-api-validation" },
      toolResult: { stdout: "graphql-api-validation\n", exit_code: 0 },
    });
    expect(mcpActivity).toMatchObject({
      toolName: "functions.exec_command",
      status: "success",
      arguments: { cmd: "echo graphql-api-validation" },
      result: { stdout: "graphql-api-validation\n", exit_code: 0 },
    });
  });

  it("projects an archived call with an active minimal result exactly once through GraphQL", async () => {
    const metadataStore = new AgentRunMetadataStore(memoryDir);
    const runId = "run-codex-cross-file-toolcalls-graphql";
    const runDir = path.join(memoryDir, "agents", runId);
    await metadataStore.writeMetadata(runId, {
      runId,
      agentDefinitionId: "agent-codex-cross-file-toolcalls",
      workspaceRootPath,
      memoryDir: runDir,
      llmModelIdentifier: "gpt-5.2-codex",
      llmConfig: null,
      autoExecuteTools: false,
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      platformAgentRunId: "native-thread-should-not-recover-cross-file",
    } satisfies AgentRunMetadata);

    const writer = new RunMemoryWriter({ memoryDir: runDir });
    writer.appendRawTrace({
      traceType: "tool_call",
      turnId: "turn-cross-file",
      sourceEvent: "TOOL_EXECUTION_STARTED",
      ts: TOOL_TS,
      toolCallId: "cross-file-tool-1",
      toolName: "functions.exec_command",
      toolArgs: { cmd: "printf cross-file" },
    });
    const boundaryKey = "codex:thread-cross-file:projection-boundary";
    const boundary = writer.appendRawTrace({
      traceType: "provider_compaction_boundary",
      turnId: "turn-cross-file",
      sourceEvent: "COMPACTION_STATUS",
      ts: TOOL_TS + 0.1,
      content: "Provider compaction boundary",
      correlationId: boundaryKey,
      toolResult: {
        provider: "codex",
        rotation_eligible: true,
      },
    });
    writer.rotateActiveRawTracesBeforeBoundary({
      boundaryTraceId: boundary.id,
      boundaryKey,
      boundaryType: "provider_compaction_boundary",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      sourceEvent: "codex.thread_compacted",
    });
    writer.appendRawTrace({
      traceType: "tool_result",
      turnId: "turn-cross-file",
      sourceEvent: "TOOL_EXECUTION_SUCCEEDED",
      ts: TOOL_TS + 0.2,
      toolCallId: "cross-file-tool-1",
      toolResult: { stdout: "cross-file", exit_code: 0 },
      toolError: null,
    });

    const lifecycle = writer.readToolTraceLifecycleGroups();
    expect([...lifecycle.values()]).toEqual([
      expect.objectContaining({
        identity: { turnId: "turn-cross-file", toolCallId: "cross-file-tool-1" },
        call: expect.objectContaining({ toolName: "functions.exec_command" }),
        result: expect.objectContaining({ toolResult: { stdout: "cross-file", exit_code: 0 } }),
      }),
    ]);

    const result = await execGraphql<{ getRunProjection: ProjectionPayload }>(
      `
        query RunProjection($runId: String!) {
          getRunProjection(runId: $runId) {
            runId
            summary
            lastActivityAt
            conversation
            activities
          }
        }
      `,
      { runId },
    );

    const conversationRows = result.getRunProjection.conversation.filter(
      (row) => row.invocationId === "cross-file-tool-1",
    );
    const activityRows = result.getRunProjection.activities.filter(
      (row) => row.invocationId === "cross-file-tool-1",
    );
    expect(readThreadMock).not.toHaveBeenCalled();
    expect(conversationRows).toHaveLength(1);
    expect(activityRows).toHaveLength(1);
    expect(conversationRows[0]).toMatchObject({
      kind: "tool_call",
      toolName: "functions.exec_command",
      toolArgs: { cmd: "printf cross-file" },
      toolResult: { stdout: "cross-file", exit_code: 0 },
    });
    expect(activityRows[0]).toMatchObject({
      toolName: "functions.exec_command",
      arguments: { cmd: "printf cross-file" },
      result: { stdout: "cross-file", exit_code: 0 },
      status: "success",
    });
  });

  it("preserves Codex reasoning across runtime writes and reloads through getRunProjection", async () => {
    const metadataStore = new AgentRunMetadataStore(memoryDir);
    const runId = "run-codex-reasoning-durability-graphql";
    const runDir = path.join(memoryDir, "agents", runId);
    await metadataStore.writeMetadata(runId, {
      runId,
      agentDefinitionId: "agent-codex-reasoning-durability",
      workspaceRootPath,
      memoryDir: runDir,
      llmModelIdentifier: "gpt-5.2-codex",
      llmConfig: null,
      autoExecuteTools: false,
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      platformAgentRunId: "native-thread-should-not-recover-reasoning",
    } satisfies AgentRunMetadata);

    const writer = new RunMemoryWriter({ memoryDir: runDir });
    const accumulator = new RuntimeMemoryEventAccumulator({
      runId,
      writer,
      toolTraceLifecycleGroups: writer.readToolTraceLifecycleGroups(),
    });

    accumulator.recordRunEvent(event(runId, AgentRunEventType.TURN_STARTED, { turnId: "turn-tool" }));
    accumulator.recordRunEvent(event(runId, AgentRunEventType.SEGMENT_CONTENT, {
      id: "reasoning-before-tool",
      turn_id: "turn-tool",
      segment_type: "reasoning",
      delta: "think before explicit tool",
    }));
    accumulator.recordRunEvent(event(runId, AgentRunEventType.TOOL_EXECUTION_STARTED, {
      invocation_id: "explicit-tool-after-reasoning",
      turn_id: "turn-tool",
      tool_name: "functions.exec_command",
      arguments: { cmd: "pwd" },
    }));
    accumulator.recordRunEvent(event(runId, AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "explicit-tool-after-reasoning",
      turn_id: "turn-tool",
      tool_name: "functions.exec_command",
      arguments: { cmd: "pwd" },
      result: { stdout: "/tmp/project\n", exit_code: 0 },
    }));
    accumulator.recordRunEvent(event(runId, AgentRunEventType.SEGMENT_END, {
      id: "reasoning-before-tool",
      turn_id: "turn-tool",
      segment_type: "reasoning",
    }));
    accumulator.recordRunEvent(event(runId, AgentRunEventType.TURN_COMPLETED, { turnId: "turn-tool" }));

    accumulator.recordRunEvent(event(runId, AgentRunEventType.TURN_STARTED, { turnId: "turn-inferred" }));
    accumulator.recordRunEvent(event(runId, AgentRunEventType.SEGMENT_CONTENT, {
      id: "reasoning-before-inferred-result",
      turn_id: "turn-inferred",
      segment_type: "reasoning",
      delta: "think before inferred terminal result",
    }));
    accumulator.recordRunEvent(event(runId, AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "inferred-tool-after-reasoning",
      turn_id: "turn-inferred",
      tool_name: "run_bash",
      arguments: { command: "echo inferred" },
      result: { stdout: "inferred\n" },
    }));
    accumulator.recordRunEvent(event(runId, AgentRunEventType.SEGMENT_END, {
      id: "reasoning-before-inferred-result",
      turn_id: "turn-inferred",
      segment_type: "reasoning",
    }));
    accumulator.recordRunEvent(event(runId, AgentRunEventType.TURN_COMPLETED, { turnId: "turn-inferred" }));

    accumulator.recordRunEvent(event(runId, AgentRunEventType.TURN_STARTED, { turnId: "turn-text" }));
    accumulator.recordRunEvent(event(runId, AgentRunEventType.SEGMENT_CONTENT, {
      id: "reasoning-before-text",
      turn_id: "turn-text",
      segment_type: "reasoning",
      delta: "think before assistant text",
    }));
    accumulator.recordRunEvent(event(runId, AgentRunEventType.SEGMENT_CONTENT, {
      id: "assistant-text-after-reasoning",
      turn_id: "turn-text",
      segment_type: "text",
      delta: "assistant text after thinking",
    }));
    accumulator.recordRunEvent(event(runId, AgentRunEventType.SEGMENT_END, {
      id: "assistant-text-after-reasoning",
      turn_id: "turn-text",
      segment_type: "text",
    }));
    accumulator.recordRunEvent(event(runId, AgentRunEventType.SEGMENT_END, {
      id: "reasoning-before-text",
      turn_id: "turn-text",
      segment_type: "reasoning",
    }));
    accumulator.recordRunEvent(event(runId, AgentRunEventType.TURN_COMPLETED, { turnId: "turn-text" }));

    accumulator.recordRunEvent(event(runId, AgentRunEventType.TURN_STARTED, { turnId: "turn-complete" }));
    accumulator.recordRunEvent(event(runId, AgentRunEventType.SEGMENT_CONTENT, {
      id: "reasoning-before-complete",
      turn_id: "turn-complete",
      segment_type: "reasoning",
      delta: "think before assistant complete",
    }));
    accumulator.recordRunEvent(event(runId, AgentRunEventType.ASSISTANT_COMPLETE, {
      turn_id: "turn-complete",
      content: "assistant complete after thinking",
    }));
    accumulator.recordRunEvent(event(runId, AgentRunEventType.SEGMENT_END, {
      id: "reasoning-before-complete",
      turn_id: "turn-complete",
      segment_type: "reasoning",
    }));
    accumulator.recordRunEvent(event(runId, AgentRunEventType.TURN_COMPLETED, { turnId: "turn-complete" }));

    const result = await execGraphql<{ getRunProjection: ProjectionPayload }>(
      `
        query RunProjection($runId: String!) {
          getRunProjection(runId: $runId) {
            runId
            summary
            lastActivityAt
            conversation
            activities
          }
        }
      `,
      { runId },
    );

    const projection = result.getRunProjection;
    const serializedProjection = JSON.stringify(projection);
    const reasoningRows = projection.conversation.filter((row) => row.kind === "reasoning");
    const explicitTool = findToolRow(projection.conversation, "explicit-tool-after-reasoning");
    const inferredTool = findToolRow(projection.conversation, "inferred-tool-after-reasoning");
    const rowIndex = (predicate: (row: Record<string, unknown>) => boolean): number =>
      projection.conversation.findIndex(predicate);
    const reasoningIndex = (content: string): number =>
      rowIndex((row) => row.kind === "reasoning" && row.content === content);
    const messageIndex = (content: string): number =>
      rowIndex((row) => row.kind === "message" && row.content === content);
    const toolIndex = (invocationId: string): number =>
      rowIndex((row) => row.kind === "tool_call" && row.invocationId === invocationId);

    expect(readThreadMock).not.toHaveBeenCalled();
    expect(serializedProjection).not.toContain(NATIVE_THREAD_MARKER);
    expect(projection.conversation.map((row) => row.kind)).toEqual([
      "reasoning",
      "tool_call",
      "reasoning",
      "tool_call",
      "reasoning",
      "message",
      "reasoning",
      "message",
    ]);
    expect(reasoningRows.map((row) => row.content)).toEqual(expect.arrayContaining([
      "think before explicit tool",
      "think before inferred terminal result",
      "think before assistant text",
      "think before assistant complete",
    ]));
    expect(reasoningRows).toHaveLength(4);
    expect(findReasoningRow(projection.conversation, "think before explicit tool")).toBeTruthy();
    expect(findReasoningRow(projection.conversation, "think before inferred terminal result")).toBeTruthy();
    expect(findReasoningRow(projection.conversation, "think before assistant text")).toBeTruthy();
    expect(findReasoningRow(projection.conversation, "think before assistant complete")).toBeTruthy();
    expect(reasoningIndex("think before explicit tool")).toBeLessThan(
      toolIndex("explicit-tool-after-reasoning"),
    );
    expect(reasoningIndex("think before inferred terminal result")).toBeLessThan(
      toolIndex("inferred-tool-after-reasoning"),
    );
    expect(reasoningIndex("think before assistant text")).toBeLessThan(
      messageIndex("assistant text after thinking"),
    );
    expect(reasoningIndex("think before assistant complete")).toBeLessThan(
      messageIndex("assistant complete after thinking"),
    );
    expect(explicitTool).toMatchObject({
      kind: "tool_call",
      toolName: "functions.exec_command",
      toolArgs: { cmd: "pwd" },
      toolResult: { stdout: "/tmp/project\n", exit_code: 0 },
    });
    expect(inferredTool).toMatchObject({
      kind: "tool_call",
      toolName: "run_bash",
      toolArgs: { command: "echo inferred" },
      toolResult: { stdout: "inferred\n" },
    });
    expect(projection.conversation[messageIndex("assistant text after thinking")]).toMatchObject({
      kind: "message",
      role: "assistant",
      content: "assistant text after thinking",
    });
    expect(projection.conversation[messageIndex("assistant complete after thinking")]).toMatchObject({
      kind: "message",
      role: "assistant",
      content: "assistant complete after thinking",
    });
    expect(findToolRow(projection.activities, "explicit-tool-after-reasoning")).toMatchObject({
      toolName: "functions.exec_command",
      status: "success",
      result: { stdout: "/tmp/project\n", exit_code: 0 },
    });
    expect(findToolRow(projection.activities, "inferred-tool-after-reasoning")).toMatchObject({
      toolName: "run_bash",
      status: "success",
      result: { stdout: "inferred\n" },
    });
  });

  it("preserves the exact packaged tool-update reasoning sequence through GraphQL reload", async () => {
    const metadataStore = new AgentRunMetadataStore(memoryDir);
    const runId = "run-codex-ordered-tool-reasoning-graphql";
    const runDir = path.join(memoryDir, "agents", runId);
    await metadataStore.writeMetadata(runId, {
      runId,
      agentDefinitionId: "agent-codex-ordered-tool-reasoning",
      workspaceRootPath,
      memoryDir: runDir,
      llmModelIdentifier: "gpt-5.6-sol",
      llmConfig: { reasoning_effort: "max" },
      autoExecuteTools: false,
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      platformAgentRunId: "native-thread-must-not-recover-ordered-tool-reasoning",
    } satisfies AgentRunMetadata);

    const writer = new RunMemoryWriter({ memoryDir: runDir });
    const accumulator = new RuntimeMemoryEventAccumulator({
      runId,
      writer,
      toolTraceLifecycleGroups: writer.readToolTraceLifecycleGroups(),
    });
    const converter = new CodexThreadEventConverter(runId);
    const recordConverted = (method: string, params: Record<string, unknown>): AgentRunEvent[] => {
      const converted = converter.convert({ method, params });
      converted.forEach((convertedEvent) => accumulator.recordRunEvent(convertedEvent));
      return converted;
    };
    const completedReasoning = (turnId: string, itemId: string, text: string): AgentRunEvent => {
      const converted = recordConverted(CodexThreadEventName.ITEM_COMPLETED, {
        turnId,
        item: { id: itemId, type: "reasoning", summary: [{ text }] },
      });
      const reasoningEvent = converted.find(
        (runtimeEvent) =>
          runtimeEvent.eventType === AgentRunEventType.SEGMENT_CONTENT &&
          runtimeEvent.payload.segment_type === "reasoning",
      );
      if (!reasoningEvent) throw new Error(`Expected reasoning event for ${itemId}.`);
      return reasoningEvent;
    };
    const ignoredReasoningDeltas = (turnId: string): AgentRunEvent[] => [
      CodexThreadEventName.ITEM_REASONING_SUMMARY_TEXT_DELTA,
      CodexThreadEventName.ITEM_REASONING_DELTA,
      CodexThreadEventName.ITEM_REASONING_SUMMARY_PART_ADDED,
    ].flatMap((method) => recordConverted(method, {
      turnId,
      itemId: "ignored-reasoning-delta",
      delta: "must never be displayed or persisted",
    }));

    recordConverted(CodexThreadEventName.TURN_STARTED, {
      turn: { id: "turn-matching-update" },
    });
    expect(ignoredReasoningDeltas("turn-matching-update")).toEqual([]);
    recordConverted(CodexThreadEventName.ITEM_STARTED, {
      turnId: "turn-matching-update",
      item: {
        id: "tool-1",
        type: "commandExecution",
        command: "sleep 1",
        status: "inProgress",
      },
    });
    const reasoningA = completedReasoning("turn-matching-update", "provider-a", "A");
    expect(ignoredReasoningDeltas("turn-matching-update")).toEqual([]);
    recordConverted(CodexThreadEventName.ITEM_COMPLETED, {
      turnId: "turn-matching-update",
      item: {
        id: "tool-1",
        type: "commandExecution",
        command: "sleep 1",
        status: "completed",
        aggregatedOutput: "done\n",
      },
    });
    const reasoningB = completedReasoning("turn-matching-update", "provider-b", "B");
    expect(recordConverted(CodexThreadEventName.ITEM_REASONING_COMPLETED, {
      turnId: "turn-matching-update",
      item: { id: "provider-b", summary: [{ text: "B" }] },
    })).toEqual([]);
    expect(ignoredReasoningDeltas("turn-matching-update")).toEqual([]);
    recordConverted(CodexThreadEventName.ITEM_STARTED, {
      turnId: "turn-matching-update",
      item: {
        id: "tool-2",
        type: "commandExecution",
        command: "pwd",
        status: "inProgress",
      },
    });
    const reasoningAfterNextTool = completedReasoning(
      "turn-matching-update",
      "provider-c",
      "after next tool",
    );
    recordConverted(CodexThreadEventName.ITEM_COMPLETED, {
      turnId: "turn-matching-update",
      item: {
        id: "tool-2",
        type: "commandExecution",
        command: "pwd",
        status: "completed",
        aggregatedOutput: "/tmp/project\n",
      },
    });
    recordConverted(CodexThreadEventName.TURN_COMPLETED, {
      turn: { id: "turn-matching-update" },
    });

    recordConverted(CodexThreadEventName.TURN_STARTED, {
      turn: { id: "turn-result-first" },
    });
    const reasoningBeforeResultFirst = completedReasoning(
      "turn-result-first",
      "provider-result-first-a",
      "before result-first",
    );
    recordConverted(CodexThreadEventName.ITEM_COMPLETED, {
      turnId: "turn-result-first",
      item: {
        id: "tool-result-first",
        type: "commandExecution",
        command: "echo inferred",
        status: "completed",
        aggregatedOutput: "inferred\n",
      },
    });
    const reasoningAfterResultFirst = completedReasoning(
      "turn-result-first",
      "provider-result-first-b",
      "after result-first",
    );
    recordConverted(CodexThreadEventName.TURN_COMPLETED, {
      turn: { id: "turn-result-first" },
    });

    expect(reasoningB.payload).toMatchObject({
      id: reasoningA.payload.id,
      delta: "\n\nB",
    });
    expect(reasoningAfterNextTool.payload.id).not.toBe(reasoningA.payload.id);
    expect(reasoningAfterResultFirst.payload.id).not.toBe(reasoningBeforeResultFirst.payload.id);

    const persistedRows = (await fs.readFile(
      path.join(runDir, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME),
      "utf-8",
    ))
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    const persistedRelevant = persistedRows
      .filter((row) => ["reasoning", "tool_call", "tool_result"].includes(String(row.trace_type)))
      .map((row) => ({
        type: row.trace_type,
        content: row.content ?? "",
        toolCallId: row.tool_call_id ?? null,
      }));
    expect(persistedRelevant).toEqual([
      { type: "tool_call", content: "", toolCallId: "tool-1" },
      { type: "tool_result", content: "", toolCallId: "tool-1" },
      { type: "reasoning", content: "A\n\nB", toolCallId: null },
      { type: "tool_call", content: "", toolCallId: "tool-2" },
      { type: "tool_result", content: "", toolCallId: "tool-2" },
      { type: "reasoning", content: "after next tool", toolCallId: null },
      { type: "reasoning", content: "before result-first", toolCallId: null },
      { type: "tool_call", content: "", toolCallId: "tool-result-first" },
      { type: "tool_result", content: "", toolCallId: "tool-result-first" },
      { type: "reasoning", content: "after result-first", toolCallId: null },
    ]);
    expect(JSON.stringify(persistedRows)).not.toContain("must never be displayed or persisted");

    const result = await execGraphql<{ getRunProjection: ProjectionPayload }>(
      `
        query RunProjection($runId: String!) {
          getRunProjection(runId: $runId) {
            runId
            summary
            lastActivityAt
            conversation
            activities
          }
        }
      `,
      { runId },
    );
    const projection = result.getRunProjection;
    const reasoningRows = projection.conversation.filter((row) => row.kind === "reasoning");
    const reasoningContents = reasoningRows.map((row) => row.content);
    const toolOneIndex = projection.conversation.findIndex(
      (row) => row.kind === "tool_call" && row.invocationId === "tool-1",
    );
    const matchingReasoningIndex = projection.conversation.findIndex(
      (row) => row.kind === "reasoning" && row.content === "A\n\nB",
    );
    const toolTwoIndex = projection.conversation.findIndex(
      (row) => row.kind === "tool_call" && row.invocationId === "tool-2",
    );
    const beforeResultFirstIndex = projection.conversation.findIndex(
      (row) => row.kind === "reasoning" && row.content === "before result-first",
    );
    const resultFirstToolIndex = projection.conversation.findIndex(
      (row) => row.kind === "tool_call" && row.invocationId === "tool-result-first",
    );
    const afterResultFirstIndex = projection.conversation.findIndex(
      (row) => row.kind === "reasoning" && row.content === "after result-first",
    );

    expect(readThreadMock).not.toHaveBeenCalled();
    expect(reasoningContents).toEqual([
      "A\n\nB",
      "after next tool",
      "before result-first",
      "after result-first",
    ]);
    expect(toolOneIndex).toBeLessThan(matchingReasoningIndex);
    expect(matchingReasoningIndex).toBeLessThan(toolTwoIndex);
    expect(beforeResultFirstIndex).toBeLessThan(resultFirstToolIndex);
    expect(resultFirstToolIndex).toBeLessThan(afterResultFirstIndex);
    expect(findToolRow(projection.conversation, "tool-1")).toMatchObject({
      kind: "tool_call",
      invocationId: "tool-1",
    });
    expect(findToolRow(projection.activities, "tool-1")).toMatchObject({
      status: "success",
    });
    expect(JSON.stringify(projection)).not.toContain("must never be displayed or persisted");
  });

  it("returns empty standalone Codex projection instead of native recovery when local replay is absent", async () => {
    const metadataStore = new AgentRunMetadataStore(memoryDir);
    const runId = "run-codex-local-replay-absent";
    const runDir = path.join(memoryDir, "agents", runId);
    await metadataStore.writeMetadata(runId, {
      runId,
      agentDefinitionId: "agent-codex-local-replay-absent",
      workspaceRootPath,
      memoryDir: runDir,
      llmModelIdentifier: "gpt-5.2-codex",
      llmConfig: null,
      autoExecuteTools: false,
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      platformAgentRunId: "native-thread-should-not-recover-standalone",
    } satisfies AgentRunMetadata);

    const result = await execGraphql<{ getRunProjection: ProjectionPayload }>(
      `
        query RunProjection($runId: String!) {
          getRunProjection(runId: $runId) {
            runId
            summary
            lastActivityAt
            conversation
            activities
          }
        }
      `,
      { runId },
    );

    const projection = result.getRunProjection;
    const serializedProjection = JSON.stringify(projection);

    expect(readThreadMock).not.toHaveBeenCalled();
    expect(serializedProjection).not.toContain(NATIVE_THREAD_MARKER);
    expect(projection.summary).toBeNull();
    expect(projection.lastActivityAt).toBeNull();
    expect(projection.conversation).toEqual([]);
    expect(projection.activities).toEqual([]);
  });

  it("serves local replay team-member Codex tool rows through getTeamMemberRunProjection", async () => {
    const teamMetadataStore = new TeamRunMetadataStore(memoryDir);
    await teamMetadataStore.writeMetadata(TEAM_RUN_ID, {
      teamRunId: TEAM_RUN_ID,
      teamDefinitionId: "team-definition-1",
      teamDefinitionName: "Tool Projection Validation Team",
      coordinatorMemberRouteKey: "coordinator",
      createdAt: new Date(USER_TS * 1000).toISOString(),
      memberTree: [
        {
          memberKind: "agent",
          memberRouteKey: "coordinator",
          memberPath: ["coordinator"],
          memberName: "coordinator",
          memberRunId: MEMBER_RUN_ID,
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          platformAgentRunId: MEMBER_THREAD_ID,
          agentDefinitionId: "agent-codex-member",
          llmModelIdentifier: "gpt-5.2-codex",
          autoExecuteTools: false,
          skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
          llmConfig: null,
          workspaceRootPath,
          applicationExecutionContext: null,
        },
      ],
    } satisfies TeamRunMetadata);

    const memberDir = new AgentMemoryLayout(memoryDir).getTeamAgentRunDirPath(
      { rootTeamRunId: TEAM_RUN_ID, teamRunPath: [] },
      MEMBER_RUN_ID,
    );
    await writeLocalReplayToolTrace(memberDir, {
      userText: "Send the team-member validation message.",
      dynamicInvocationId: "dynamic-send-member-1",
      dynamicArgs: {
        recipient_name: "delivery_engineer",
        content: "team projection validation",
      },
    });

    const result = await execGraphql<{ getTeamMemberRunProjection: ProjectionPayload }>(
      `
        query MemberProjection($teamRunId: String!, $memberRouteKey: String!) {
          getTeamMemberRunProjection(teamRunId: $teamRunId, memberRouteKey: $memberRouteKey) {
            agentRunId
            summary
            lastActivityAt
            conversation
            activities
          }
        }
      `,
      { teamRunId: TEAM_RUN_ID, memberRouteKey: "coordinator" },
    );

    const projection = result.getTeamMemberRunProjection;
    const conversationRows = projection.conversation.filter(
      (row) => row.invocationId === "dynamic-send-member-1",
    );
    const activityRows = projection.activities.filter(
      (row) => row.invocationId === "dynamic-send-member-1",
    );
    const mcpConversation = findToolRow(projection.conversation, "mcp-call-1");
    const mcpActivity = findToolRow(projection.activities, "mcp-call-1");
    const serializedConversation = JSON.stringify(projection.conversation);

    expect(readThreadMock).not.toHaveBeenCalled();
    expect(serializedConversation).toContain(LOCAL_REPLAY_MARKER);
    expect(conversationRows).toHaveLength(1);
    expect(activityRows).toHaveLength(1);
    expect(conversationRows[0]).toMatchObject({
      kind: "tool_call",
      toolName: "send_message_to",
      toolArgs: {
        recipient_name: "delivery_engineer",
        content: "team projection validation",
      },
      toolResult: { delivered: true },
    });
    expect(activityRows[0]).toMatchObject({
      toolName: "send_message_to",
      status: "success",
      arguments: {
        recipient_name: "delivery_engineer",
        content: "team projection validation",
      },
      result: { delivered: true },
    });
    expect(mcpConversation).toMatchObject({
      kind: "tool_call",
      toolName: "functions.exec_command",
      toolArgs: { cmd: "echo graphql-api-validation" },
    });
    expect(mcpActivity).toMatchObject({
      toolName: "functions.exec_command",
      status: "success",
      arguments: { cmd: "echo graphql-api-validation" },
    });
  });

  it("returns empty team-member Codex projection instead of native recovery when local replay is absent", async () => {
    const teamMetadataStore = new TeamRunMetadataStore(memoryDir);
    const teamRunId = "team-codex-local-replay-absent";
    const memberRunId = "member-codex-local-replay-absent";
    await teamMetadataStore.writeMetadata(teamRunId, {
      teamRunId,
      teamDefinitionId: "team-definition-local-replay-absent",
      teamDefinitionName: "Local Replay Absent Team",
      coordinatorMemberRouteKey: "coordinator",
      createdAt: new Date(USER_TS * 1000).toISOString(),
      memberTree: [
        {
          memberKind: "agent",
          memberRouteKey: "coordinator",
          memberPath: ["coordinator"],
          memberName: "coordinator",
          memberRunId,
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          platformAgentRunId: "native-thread-should-not-recover-member",
          agentDefinitionId: "agent-codex-member-local-replay-absent",
          llmModelIdentifier: "gpt-5.2-codex",
          autoExecuteTools: false,
          skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
          llmConfig: null,
          workspaceRootPath,
          applicationExecutionContext: null,
        },
      ],
    } satisfies TeamRunMetadata);

    const result = await execGraphql<{ getTeamMemberRunProjection: ProjectionPayload }>(
      `
        query MemberProjection($teamRunId: String!, $memberRouteKey: String!) {
          getTeamMemberRunProjection(teamRunId: $teamRunId, memberRouteKey: $memberRouteKey) {
            agentRunId
            summary
            lastActivityAt
            conversation
            activities
          }
        }
      `,
      { teamRunId, memberRouteKey: "coordinator" },
    );

    const projection = result.getTeamMemberRunProjection;
    const serializedProjection = JSON.stringify(projection);

    expect(readThreadMock).not.toHaveBeenCalled();
    expect(serializedProjection).not.toContain(NATIVE_THREAD_MARKER);
    expect(projection.summary).toBeNull();
    expect(projection.lastActivityAt).toBeNull();
    expect(projection.conversation).toEqual([]);
    expect(projection.activities).toEqual([]);
  });
});
