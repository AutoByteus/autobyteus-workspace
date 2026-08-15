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
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { RuntimeMemoryEventAccumulator } from "../../../src/agent-memory/services/runtime-memory-event-accumulator.js";
import { ExternalRuntimeMemoryWriter } from "../../../src/agent-memory/store/external-runtime-memory-writer.js";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../src/agent-execution/domain/agent-run-event.js";
import type { JsonObject } from "../../../src/agent-execution/backends/codex/codex-app-server-json.js";
import { createCodexThreadEventHarness } from "../../fixtures/codex-thread-event-harness.js";
import { CodexThreadEventName } from "../../../src/agent-execution/backends/codex/events/codex-thread-event-name.js";
import { AgentSegmentLifecycleEventTransformer } from "../../../src/agent-execution/events/processors/segment-lifecycle/agent-segment-lifecycle-event-transformer.js";
import { AgentSegmentLifecycleState } from "../../../src/agent-execution/events/processors/segment-lifecycle/agent-segment-lifecycle-state.js";
import { AgentTurnLifecycleState } from "../../../src/agent-execution/events/processors/lifecycle-status/agent-turn-lifecycle-state.js";

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

const event = (
  runId: string,
  eventType: AgentRunEventType,
  payload: Record<string, unknown>,
): AgentRunEvent => ({
  eventType,
  runId,
  payload: { ...payload },
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
        recipient_address: "code_reviewer",
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
        recipient_address: "code_reviewer",
        content: "standalone projection validation",
      },
      toolResult: { delivered: true },
    });
    expect(dynamicActivity).toMatchObject({
      toolName: "send_message_to",
      status: "success",
      arguments: {
        recipient_address: "code_reviewer",
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

  it("projects an active name-bearing result without recovering archived call arguments", async () => {
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

    const writer = new ExternalRuntimeMemoryWriter({ memoryDir: runDir });
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
      toolName: "functions.exec_command",
      toolResult: { stdout: "cross-file", exit_code: 0 },
      toolError: null,
    });

    const lifecycle = writer.readToolTraceLifecycleGroups();
    expect([...lifecycle.values()]).toEqual([
      expect.objectContaining({
        identity: { turnId: "turn-cross-file", toolCallId: "cross-file-tool-1" },
        call: expect.objectContaining({ toolName: "functions.exec_command" }),
        result: expect.objectContaining({
          toolName: "functions.exec_command",
          toolArgs: null,
          toolResult: { stdout: "cross-file", exit_code: 0 },
        }),
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
      toolArgs: null,
      toolResult: { stdout: "cross-file", exit_code: 0 },
    });
    expect(activityRows[0]).toMatchObject({
      toolName: "functions.exec_command",
      arguments: {},
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

    const writer = new ExternalRuntimeMemoryWriter({ memoryDir: runDir });
    const accumulator = new RuntimeMemoryEventAccumulator({
      runId,
      writer,
      toolTraceLifecycleGroups: writer.readToolTraceLifecycleGroups(),
    });

    const segmentLifecycleTransformer = new AgentSegmentLifecycleEventTransformer();
    const segmentLifecycleState = new AgentSegmentLifecycleState();
    const turnLifecycleState = new AgentTurnLifecycleState();
    const recordCanonicalEvent = (sourceEvent: AgentRunEvent): void => {
      const canonicalEvents = segmentLifecycleTransformer.transform({
        runContext: {} as never,
        events: [sourceEvent],
        lifecycleState: turnLifecycleState,
        segmentLifecycleState,
      });
      canonicalEvents.forEach((canonicalEvent) => accumulator.recordRunEvent(canonicalEvent));
    };

    recordCanonicalEvent(event(runId, AgentRunEventType.TURN_STARTED, { turnId: "turn-tool" }));
    recordCanonicalEvent(event(runId, AgentRunEventType.SEGMENT_START, {
      id: "reasoning-before-tool",
      turn_id: "turn-tool",
      segment_type: "reasoning",
    }));
    recordCanonicalEvent(event(runId, AgentRunEventType.SEGMENT_CONTENT, {
      id: "reasoning-before-tool",
      turn_id: "turn-tool",
      delta: "think before explicit tool",
    }));
    recordCanonicalEvent(event(runId, AgentRunEventType.TOOL_EXECUTION_STARTED, {
      invocation_id: "explicit-tool-after-reasoning",
      turn_id: "turn-tool",
      tool_name: "functions.exec_command",
      arguments: { cmd: "pwd" },
    }));
    recordCanonicalEvent(event(runId, AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "explicit-tool-after-reasoning",
      turn_id: "turn-tool",
      tool_name: "functions.exec_command",
      arguments: { cmd: "pwd" },
      result: { stdout: "/tmp/project\n", exit_code: 0 },
    }));
    recordCanonicalEvent(event(runId, AgentRunEventType.SEGMENT_END, {
      id: "reasoning-before-tool",
      turn_id: "turn-tool",
    }));
    recordCanonicalEvent(event(runId, AgentRunEventType.TURN_COMPLETED, { turnId: "turn-tool" }));

    recordCanonicalEvent(event(runId, AgentRunEventType.TURN_STARTED, { turnId: "turn-inferred" }));
    recordCanonicalEvent(event(runId, AgentRunEventType.SEGMENT_START, {
      id: "reasoning-before-inferred-result",
      turn_id: "turn-inferred",
      segment_type: "reasoning",
    }));
    recordCanonicalEvent(event(runId, AgentRunEventType.SEGMENT_CONTENT, {
      id: "reasoning-before-inferred-result",
      turn_id: "turn-inferred",
      delta: "think before inferred terminal result",
    }));
    recordCanonicalEvent(event(runId, AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "inferred-tool-after-reasoning",
      turn_id: "turn-inferred",
      tool_name: "run_bash",
      arguments: { command: "echo inferred" },
      result: { stdout: "inferred\n" },
    }));
    recordCanonicalEvent(event(runId, AgentRunEventType.SEGMENT_END, {
      id: "reasoning-before-inferred-result",
      turn_id: "turn-inferred",
    }));
    recordCanonicalEvent(event(runId, AgentRunEventType.TURN_COMPLETED, { turnId: "turn-inferred" }));

    recordCanonicalEvent(event(runId, AgentRunEventType.TURN_STARTED, { turnId: "turn-text" }));
    recordCanonicalEvent(event(runId, AgentRunEventType.SEGMENT_START, {
      id: "reasoning-before-text",
      turn_id: "turn-text",
      segment_type: "reasoning",
    }));
    recordCanonicalEvent(event(runId, AgentRunEventType.SEGMENT_CONTENT, {
      id: "reasoning-before-text",
      turn_id: "turn-text",
      delta: "think before assistant text",
    }));
    recordCanonicalEvent(event(runId, AgentRunEventType.SEGMENT_START, {
      id: "assistant-text-after-reasoning",
      turn_id: "turn-text",
      segment_type: "text",
    }));
    recordCanonicalEvent(event(runId, AgentRunEventType.SEGMENT_CONTENT, {
      id: "assistant-text-after-reasoning",
      turn_id: "turn-text",
      delta: "assistant text after thinking",
    }));
    recordCanonicalEvent(event(runId, AgentRunEventType.SEGMENT_END, {
      id: "assistant-text-after-reasoning",
      turn_id: "turn-text",
    }));
    recordCanonicalEvent(event(runId, AgentRunEventType.SEGMENT_END, {
      id: "reasoning-before-text",
      turn_id: "turn-text",
    }));
    recordCanonicalEvent(event(runId, AgentRunEventType.TURN_COMPLETED, { turnId: "turn-text" }));

    recordCanonicalEvent(event(runId, AgentRunEventType.TURN_STARTED, { turnId: "turn-complete" }));
    recordCanonicalEvent(event(runId, AgentRunEventType.SEGMENT_START, {
      id: "reasoning-before-complete",
      turn_id: "turn-complete",
      segment_type: "reasoning",
    }));
    recordCanonicalEvent(event(runId, AgentRunEventType.SEGMENT_CONTENT, {
      id: "reasoning-before-complete",
      turn_id: "turn-complete",
      delta: "think before assistant complete",
    }));
    recordCanonicalEvent(event(runId, AgentRunEventType.ASSISTANT_COMPLETE, {
      turn_id: "turn-complete",
      content: "assistant complete after thinking",
    }));
    recordCanonicalEvent(event(runId, AgentRunEventType.SEGMENT_END, {
      id: "reasoning-before-complete",
      turn_id: "turn-complete",
    }));
    recordCanonicalEvent(event(runId, AgentRunEventType.TURN_COMPLETED, { turnId: "turn-complete" }));

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
    const messageIndex = (content: string): number =>
      rowIndex((row) => row.kind === "message" && row.content === content);

    expect(readThreadMock).not.toHaveBeenCalled();
    expect(serializedProjection).not.toContain(NATIVE_THREAD_MARKER);
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

    const writer = new ExternalRuntimeMemoryWriter({ memoryDir: runDir });
    const accumulator = new RuntimeMemoryEventAccumulator({
      runId,
      writer,
      toolTraceLifecycleGroups: writer.readToolTraceLifecycleGroups(),
    });
    const converter = createCodexThreadEventHarness(runId);
    const segmentLifecycleTransformer = new AgentSegmentLifecycleEventTransformer();
    const segmentLifecycleState = new AgentSegmentLifecycleState();
    const turnLifecycleState = new AgentTurnLifecycleState();
    const recordConverted = (method: string, params: JsonObject): AgentRunEvent[] => {
      const converted = converter.emitThroughThread({ method, params });
      const canonicalEvents = segmentLifecycleTransformer.transform({
        runContext: {} as never,
        events: converted,
        lifecycleState: turnLifecycleState,
        segmentLifecycleState,
      });
      canonicalEvents.forEach((canonicalEvent) => accumulator.recordRunEvent(canonicalEvent));
      return canonicalEvents;
    };
    const completedReasoning = (turnId: string, itemId: string, text: string): AgentRunEvent => {
      const converted = recordConverted(CodexThreadEventName.ITEM_COMPLETED, {
        turnId,
        item: { id: itemId, type: "reasoning", summary: [{ text }] },
      });
      const reasoningEvent = converted.find(
        (runtimeEvent) => runtimeEvent.eventType === AgentRunEventType.SEGMENT_CONTENT,
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

    recordConverted(CodexThreadEventName.TURN_STARTED, {
      turn: { id: "turn-unseen-insufficient-terminal" },
    });
    const reasoningBeforeInsufficientTerminal = completedReasoning(
      "turn-unseen-insufficient-terminal",
      "provider-insufficient-a",
      "before insufficient terminal",
    );
    const insufficientTerminalEvents = recordConverted(CodexThreadEventName.ITEM_COMPLETED, {
      turnId: "turn-unseen-insufficient-terminal",
      item: {
        id: "web-search-insufficient",
        type: "webSearch",
        status: "completed",
        query: "",
        action: { type: "other" },
      },
    });
    const insufficientTerminal = insufficientTerminalEvents.find(
      (runtimeEvent) => runtimeEvent.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
    );
    expect(insufficientTerminal?.payload).toMatchObject({
      invocation_id: "web-search-insufficient",
      turn_id: "turn-unseen-insufficient-terminal",
      tool_name: "search_web",
    });
    expect(insufficientTerminal?.payload).not.toHaveProperty("arguments");
    const reasoningAfterInsufficientTerminal = completedReasoning(
      "turn-unseen-insufficient-terminal",
      "provider-insufficient-b",
      "after insufficient terminal",
    );
    recordConverted(CodexThreadEventName.ITEM_COMPLETED, {
      turnId: "turn-unseen-insufficient-terminal",
      item: {
        id: "web-search-insufficient",
        type: "webSearch",
        status: "completed",
        query: "AutoByteus",
        action: { type: "search", query: "AutoByteus" },
      },
    });
    recordConverted(CodexThreadEventName.TURN_COMPLETED, {
      turn: { id: "turn-unseen-insufficient-terminal" },
    });

    expect(reasoningB.payload).toMatchObject({
      id: reasoningA.payload.id,
      delta: "\n\nB",
    });
    expect(reasoningAfterNextTool.payload.id).not.toBe(reasoningA.payload.id);
    expect(reasoningAfterResultFirst.payload.id).not.toBe(reasoningBeforeResultFirst.payload.id);
    expect(reasoningAfterInsufficientTerminal.payload.id).not.toBe(
      reasoningBeforeInsufficientTerminal.payload.id,
    );

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
      { type: "reasoning", content: "before insufficient terminal", toolCallId: null },
      { type: "tool_call", content: "", toolCallId: "web-search-insufficient" },
      { type: "tool_result", content: "", toolCallId: "web-search-insufficient" },
      { type: "reasoning", content: "after insufficient terminal", toolCallId: null },
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
    const beforeInsufficientTerminalIndex = projection.conversation.findIndex(
      (row) => row.kind === "reasoning" && row.content === "before insufficient terminal",
    );
    const insufficientTerminalToolIndex = projection.conversation.findIndex(
      (row) => row.kind === "tool_call" && row.invocationId === "web-search-insufficient",
    );
    const afterInsufficientTerminalIndex = projection.conversation.findIndex(
      (row) => row.kind === "reasoning" && row.content === "after insufficient terminal",
    );

    expect(readThreadMock).not.toHaveBeenCalled();
    expect(reasoningContents).toEqual([
      "A\n\nB",
      "after next tool",
      "before result-first",
      "after result-first",
      "before insufficient terminal",
      "after insufficient terminal",
    ]);
    expect(toolOneIndex).toBeLessThan(matchingReasoningIndex);
    expect(matchingReasoningIndex).toBeLessThan(toolTwoIndex);
    expect(beforeResultFirstIndex).toBeLessThan(resultFirstToolIndex);
    expect(resultFirstToolIndex).toBeLessThan(afterResultFirstIndex);
    expect(beforeInsufficientTerminalIndex).toBeLessThan(insufficientTerminalToolIndex);
    expect(insufficientTerminalToolIndex).toBeLessThan(afterInsufficientTerminalIndex);
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

});
