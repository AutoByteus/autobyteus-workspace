import "reflect-metadata";
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
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
const TOOL_TS = 1_710_000_001;
const ASSISTANT_TS = 1_710_000_002;
const USER_CREATED_AT = "2024-03-09T16:00:00.000Z";
const TOOL_CREATED_AT = "2024-03-09T16:00:01.000Z";
const ASSISTANT_CREATED_AT = "2024-03-09T16:00:02.000Z";

type ProjectionPayload = {
  conversation: Array<Record<string, unknown>>;
  activities: Array<Record<string, unknown>>;
};

const codexToolThreadPayload = (input: {
  threadId: string;
  userText: string;
  dynamicInvocationId: string;
  dynamicArgs: Record<string, unknown>;
  includeMcpTool?: boolean;
}): Record<string, unknown> => ({
  thread: {
    id: input.threadId,
    turns: [
      {
        id: "turn-1",
        createdAt: USER_CREATED_AT,
        items: [
          {
            type: "userMessage",
            id: "user-1",
            createdAt: USER_CREATED_AT,
            content: [{ type: "text", text: input.userText }],
          },
          {
            type: "reasoning",
            id: "reasoning-1",
            createdAt: USER_CREATED_AT,
            summary: ["Preparing tool calls from Codex thread history."],
          },
          ...(input.includeMcpTool
            ? [
                {
                  type: "mcpToolCall",
                  id: "mcp-call-1",
                  createdAt: TOOL_CREATED_AT,
                  server: "functions",
                  name: "exec_command",
                  arguments: { cmd: "echo graphql-api-validation" },
                  status: "completed",
                  result: { stdout: "graphql-api-validation\n", exit_code: 0 },
                },
              ]
            : []),
          {
            type: "dynamicToolCall",
            id: input.dynamicInvocationId,
            createdAt: TOOL_CREATED_AT,
            name: "send_message_to",
            arguments: input.dynamicArgs,
            status: "completed",
            result: { delivered: true },
          },
          {
            type: "agentMessage",
            id: "assistant-1",
            createdAt: ASSISTANT_CREATED_AT,
            text: "Tool calls are recorded.",
          },
        ],
      },
    ],
  },
});

const findToolRow = (
  rows: Array<Record<string, unknown>>,
  invocationId: string,
): Record<string, unknown> | undefined =>
  rows.find((row) => row.invocationId === invocationId);

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

  it("serves dynamic and MCP Codex thread-history tool rows through getRunProjection", async () => {
    const metadataStore = new AgentRunMetadataStore(memoryDir);
    await metadataStore.writeMetadata(STANDALONE_RUN_ID, {
      runId: STANDALONE_RUN_ID,
      agentDefinitionId: "agent-codex-toolcalls",
      workspaceRootPath,
      memoryDir: path.join(memoryDir, "agents", STANDALONE_RUN_ID),
      llmModelIdentifier: "gpt-5.2-codex",
      llmConfig: null,
      autoExecuteTools: false,
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      platformAgentRunId: STANDALONE_THREAD_ID,
      lastKnownStatus: "IDLE",
    });
    readThreadMock.mockResolvedValue(
      codexToolThreadPayload({
        threadId: STANDALONE_THREAD_ID,
        userText: "Run GraphQL standalone projection validation.",
        dynamicInvocationId: "dynamic-send-1",
        dynamicArgs: {
          recipient_name: "code_reviewer",
          content: "standalone projection validation",
        },
        includeMcpTool: true,
      }),
    );

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

    expect(readThreadMock).toHaveBeenCalledWith(STANDALONE_THREAD_ID, workspaceRootPath);
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

  it("serves merged team-member Codex tool rows through getTeamMemberRunProjection without duplicate invocations", async () => {
    const teamMetadataStore = new TeamRunMetadataStore(memoryDir);
    await teamMetadataStore.writeMetadata(TEAM_RUN_ID, {
      teamRunId: TEAM_RUN_ID,
      teamDefinitionId: "team-definition-1",
      teamDefinitionName: "Tool Projection Validation Team",
      coordinatorMemberRouteKey: "coordinator",
      runVersion: 1,
      createdAt: USER_CREATED_AT,
      updatedAt: ASSISTANT_CREATED_AT,
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
    await fs.mkdir(memberDir, { recursive: true });
    await fs.writeFile(
      path.join(memberDir, "raw_traces.jsonl"),
      [
        JSON.stringify({
          trace_type: "user",
          content: "Send the team-member validation message.",
          turn_id: "turn-1",
          seq: 1,
          ts: USER_TS,
        }),
        JSON.stringify({
          trace_type: "tool_call",
          tool_call_id: "dynamic-send-member-1",
          tool_name: "send_message_to",
          tool_args: {},
          turn_id: "turn-1",
          seq: 2,
          ts: TOOL_TS,
        }),
      ].join("\n") + "\n",
      "utf-8",
    );

    readThreadMock.mockResolvedValue(
      codexToolThreadPayload({
        threadId: MEMBER_THREAD_ID,
        userText: "Send the team-member validation message.",
        dynamicInvocationId: "dynamic-send-member-1",
        dynamicArgs: {
          recipient_name: "delivery_engineer",
          content: "team projection validation",
        },
        includeMcpTool: true,
      }),
    );

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

    expect(readThreadMock).toHaveBeenCalledWith(MEMBER_THREAD_ID, workspaceRootPath);
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
});
