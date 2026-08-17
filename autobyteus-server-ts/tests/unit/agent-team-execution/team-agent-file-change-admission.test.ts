import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { FileChangePayloadBuilder } from "../../../src/agent-execution/events/processors/file-change/file-change-payload-builder.js";
import { createTeamAgentExecutionBinding } from "../../../src/agent-team-execution/domain/team-agent-execution-binding.js";
import { TeamAgentEventAdapter } from "../../../src/agent-team-execution/services/team-agent-event-adapter.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { projectTeamAgentEventMessage } from "../../../src/services/agent-streaming/team-agent-event-websocket-projector.js";

const runId = "file-writer-run";
const execution = createTeamAgentExecutionBinding({
  rootTeamRunId: "root-team-run",
  memberAddress: "/FileWriter",
  agentRunId: runId,
});

describe("Team FILE_CHANGE admission", () => {
  it("maps one builder-derived internal payload through strict Team wire projection", () => {
    const workspaceManager = {
      getWorkspaceById: vi.fn().mockReturnValue({ getBasePath: () => "/tmp/workspace" }),
    } as any;
    const runContext = new AgentRunContext({
      runId,
      config: new AgentRunConfig({
        agentDefinitionId: "file-writer-definition",
        llmModelIdentifier: "test-model",
        autoExecuteTools: true,
        workspaceId: "workspace-1",
        skillAccessMode: SkillAccessMode.NONE,
        runtimeKind: RuntimeKind.AUTOBYTEUS,
      }),
      runtimeContext: null,
    });
    const payload = new FileChangePayloadBuilder(workspaceManager).build({
      runContext,
      path: "/tmp/workspace/src/report.txt",
      status: "available",
      sourceTool: "write_file",
      sourceInvocationId: "write-1",
      content: "hello\n",
    });
    if (!payload) throw new Error("Expected a builder-derived FILE_CHANGE payload.");
    const event: AgentRunEvent = {
      eventType: AgentRunEventType.FILE_CHANGE,
      runId,
      payload: { ...payload },
      statusHint: null,
    };

    const admitted = new TeamAgentEventAdapter(() => execution).adapt(event);
    expect(admitted.kind).toBe("publish");
    if (admitted.kind !== "publish") throw new Error(`Unexpected admission result: ${JSON.stringify(admitted)}`);
    expect(admitted.event).toEqual({
      eventType: "FILE_CHANGE",
      details: {
        fileChangeId: `${runId}:src/report.txt`,
        path: "src/report.txt",
        fileType: "file",
        status: "available",
        sourceTool: "write_file",
        sourceInvocationId: "write-1",
        content: "hello\n",
        createdAt: payload.createdAt,
        updatedAt: payload.updatedAt,
      },
      statusHint: null,
    });

    expect(projectTeamAgentEventMessage(execution, admitted.event, 7)).toEqual({
      type: "FILE_CHANGE",
      payload: {
        change_sequence: 7,
        agent_run_id: runId,
        file_change_id: `${runId}:src/report.txt`,
        path: "src/report.txt",
        file_type: "file",
        status: "available",
        source_tool: "write_file",
        source_invocation_id: "write-1",
        content: "hello\n",
        created_at: payload.createdAt,
        updated_at: payload.updatedAt,
      },
    });
  });
});
