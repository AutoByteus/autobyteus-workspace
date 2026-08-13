import { describe, expect, it } from "vitest";
import {
  TeamRunEventSourceType,
  type TeamRunEvent,
  type TeamRunMemberInputEventPayload,
} from "../../../../src/agent-team-execution/domain/team-run-event.js";
import { createTeamExecutionAddress } from "../../../../src/agent-team-execution/domain/team-execution-address.js";
import { createTeamAgentExecutionBinding } from "../../../../src/agent-team-execution/domain/team-agent-execution-binding.js";
import type { TeamAgentEvent } from "../../../../src/agent-team-execution/domain/team-agent-event.js";
import { ServerMessageType } from "../../../../src/services/agent-streaming/models.js";
import { convertTeamRunEventToServerMessage } from "../../../../src/services/agent-streaming/team-run-event-websocket-message-mapper.js";
import { projectTeamExecutionAddressDto } from "../../../../src/services/agent-streaming/team-agent-event-websocket-projector.js";

const memberInputEvent = (taskTeamRunIds: readonly string[]): TeamRunEvent => {
  const executionAddress = createTeamExecutionAddress({
    rootTeamRunId: "root-team-run-1",
    taskTeamRunIds,
    memberAddress: "/StudentStudyGroup/student_one",
    taskAgentRunId: null,
  });
  const payload: TeamRunMemberInputEventPayload = {
    messageId: "member-input-1",
    dedupeKey: "member-input:root-team-run-1:member-input-1",
    content: "You received a message from Teacher.",
    inputOrigin: "inter_agent_delivery",
    receivedAt: "2026-08-11T12:00:00.000Z",
    contextFilePaths: [],
    senderAddress: createTeamExecutionAddress({
      rootTeamRunId: "root-team-run-1",
      memberAddress: "/Teacher",
      taskAgentRunId: null,
    }),
    parentCommunicationMessageId: "team-message-1",
  };
  return {
    eventSourceType: TeamRunEventSourceType.MEMBER_INPUT,
    executionAddress,
    payload,
  };
};

describe("TeamRun member-input WebSocket identity", () => {
  it.each([
    ["persistent", []],
    ["task-Team member", ["task-team-outer", "task-team-inner"]],
  ] as const)("carries the unchanged exact %s execution address", (_label, taskTeamRunIds) => {
    const event = memberInputEvent(taskTeamRunIds);
    const message = convertTeamRunEventToServerMessage(event);
    const executionAddress = projectTeamExecutionAddressDto(event.executionAddress);

    expect(message.type).toBe(ServerMessageType.MEMBER_INPUT_MESSAGE);
    expect(message.payload.execution_address).toEqual(executionAddress);
    expect(message.payload).toEqual(expect.objectContaining({
      execution_address: executionAddress,
      content: "You received a message from Teacher.",
      input_origin: "inter_agent_delivery",
      parent_communication_message_id: "team-message-1",
    }));
  });

  it("projects provider compaction through an exact nonempty task-Team Agent binding", () => {
    const executionAddress = createTeamExecutionAddress({
      rootTeamRunId: "root-team-run-1",
      taskTeamRunIds: ["task-team-outer", "task-team-inner"],
      memberAddress: "/StudentStudyGroup/student_one",
      taskAgentRunId: null,
    });
    const execution = createTeamAgentExecutionBinding({
      executionAddress,
      agentRunId: "student-one-task-team-run",
    });
    const payload: TeamAgentEvent = {
      eventType: "COMPACTION_STATUS",
      statusHint: null,
      details: {
        phase: null,
        kind: "provider_compaction_boundary",
        status: "compacted",
        turnId: "turn-provider",
        compactionOperationId: null,
        requestedTurnId: null,
        executionTurnId: null,
        selectedBlockCount: null,
        compactedBlockCount: null,
        rawTraceCount: null,
        semanticFactCount: null,
        compactionAgentDefinitionId: null,
        compactionAgentName: null,
        compactionRuntimeKind: null,
        compactionModelIdentifier: null,
        compactionRunId: null,
        compactionTaskId: null,
        errorMessage: null,
        provider: "codex",
        sourceSurface: "codex.context_compaction_completed",
        boundaryKey: "codex:thread-1:context-item-1",
        providerEventId: "context-item-1",
        providerSessionId: null,
        providerThreadId: "thread-1",
        providerTimestamp: 123,
        trigger: "auto",
        preTokens: 120000,
        rotationEligible: true,
      },
    };

    const message = convertTeamRunEventToServerMessage({
      eventSourceType: TeamRunEventSourceType.AGENT,
      execution,
      payload,
    });

    expect(message.type).toBe(ServerMessageType.COMPACTION_STATUS);
    expect(message.payload).toEqual(expect.objectContaining({
      agent_execution: {
        kind: "task_team_agent",
        execution_address: projectTeamExecutionAddressDto(executionAddress),
        agent_run_id: "student-one-task-team-run",
      },
      kind: "provider_compaction_boundary",
      status: "compacted",
      turn_id: "turn-provider",
      provider: "codex",
      source_surface: "codex.context_compaction_completed",
      boundary_key: "codex:thread-1:context-item-1",
      provider_thread_id: "thread-1",
      provider_event_id: "context-item-1",
      rotation_eligible: true,
    }));
  });

  it("projects task delegation from exact current execution and sender addresses", () => {
    const executionAddress = createTeamExecutionAddress({
      rootTeamRunId: "root-team-run-1",
      taskTeamRunIds: ["task-team-outer"],
      memberAddress: "/StudentStudyGroup",
      taskAgentRunId: null,
    });
    const senderAddress = createTeamExecutionAddress({
      rootTeamRunId: "root-team-run-1",
      memberAddress: "/Teacher",
      taskAgentRunId: null,
    });

    const message = convertTeamRunEventToServerMessage({
      eventSourceType: TeamRunEventSourceType.TASK_DELEGATION,
      executionAddress,
      payload: {
        eventType: "TASK_DELEGATION_ACTIVATED",
        details: {
          taskId: "task_0001",
          senderAddress,
          content: "Solve and return the result.",
          referenceFiles: [],
          createdAt: "2026-08-13T00:00:00.000Z",
          startedAt: "2026-08-13T00:00:01.000Z",
        },
      },
    });

    expect(message.type).toBe(ServerMessageType.TASK_DELEGATION_EVENT);
    expect(message.payload).toEqual(expect.objectContaining({
      event_type: "TASK_DELEGATION_ACTIVATED",
      execution_address: projectTeamExecutionAddressDto(executionAddress),
      sender_address: projectTeamExecutionAddressDto(senderAddress),
      task_id: "task_0001",
      content: "Solve and return the result.",
    }));
  });

  it("projects communication with exact current addresses and structured references", () => {
    const senderAddress = createTeamExecutionAddress({
      rootTeamRunId: "root-team-run-1",
      taskTeamRunIds: ["task-team-outer"],
      memberAddress: "/StudentStudyGroup/student_one",
      taskAgentRunId: null,
    });
    const receiverAddress = createTeamExecutionAddress({
      rootTeamRunId: "root-team-run-1",
      taskTeamRunIds: ["task-team-outer"],
      memberAddress: "/StudentStudyGroup/student_two",
      taskAgentRunId: null,
    });

    const message = convertTeamRunEventToServerMessage({
      eventSourceType: TeamRunEventSourceType.COMMUNICATION,
      payload: {
        messageId: "message-1",
        senderAddress,
        receiverAddress,
        content: "Please check the result.",
        messageType: "request",
        referenceFiles: [{
          referenceId: "ref-1",
          path: "/tmp/result.md",
          type: "text/markdown",
          createdAt: "2026-08-13T00:00:00.000Z",
          updatedAt: "2026-08-13T00:00:00.000Z",
        }],
        createdAt: "2026-08-13T00:00:00.000Z",
      },
    });

    expect(message.type).toBe(ServerMessageType.TEAM_COMMUNICATION_MESSAGE);
    expect(message.payload).toEqual({
      message_id: "message-1",
      sender_address: projectTeamExecutionAddressDto(senderAddress),
      receiver_address: projectTeamExecutionAddressDto(receiverAddress),
      content: "Please check the result.",
      message_type: "request",
      reference_files: [{
        reference_id: "ref-1",
        path: "/tmp/result.md",
        type: "text/markdown",
        created_at: "2026-08-13T00:00:00.000Z",
        updated_at: "2026-08-13T00:00:00.000Z",
      }],
      created_at: "2026-08-13T00:00:00.000Z",
    });
  });
});
