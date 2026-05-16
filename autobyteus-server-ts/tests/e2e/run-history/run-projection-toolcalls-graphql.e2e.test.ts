import "reflect-metadata";
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RAW_TRACES_MEMORY_FILE_NAME } from "autobyteus-ts/memory/store/memory-file-names.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRunMetadataStore } from "../../../src/run-history/store/agent-run-metadata-store.js";
import { TeamRunMetadataStore } from "../../../src/run-history/store/team-run-metadata-store.js";
import { TeamMemberMemoryLayout } from "../../../src/agent-memory/store/team-member-memory-layout.js";

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
    path.join(runDir, RAW_TRACES_MEMORY_FILE_NAME),
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
        tool_name: "send_message_to",
        tool_args: input.dynamicArgs,
        tool_result: { delivered: true },
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
      lastKnownStatus: "IDLE",
    });
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
      lastKnownStatus: "IDLE",
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
      runVersion: 1,
      createdAt: new Date(USER_TS * 1000).toISOString(),
      updatedAt: new Date(ASSISTANT_TS * 1000).toISOString(),
      memberMetadata: [
        {
          memberRouteKey: "coordinator",
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
        },
      ],
    });

    const memberDir = new TeamMemberMemoryLayout(memoryDir).getMemberDirPath(
      TEAM_RUN_ID,
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
      runVersion: 1,
      createdAt: new Date(USER_TS * 1000).toISOString(),
      updatedAt: new Date(ASSISTANT_TS * 1000).toISOString(),
      memberMetadata: [
        {
          memberRouteKey: "coordinator",
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
        },
      ],
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
