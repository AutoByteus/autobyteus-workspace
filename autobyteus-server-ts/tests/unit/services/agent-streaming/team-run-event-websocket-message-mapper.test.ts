import { describe, expect, it } from "vitest";
import {
  TeamRunEventSourceType,
  type TeamRunEvent,
  type TeamRunMemberInputEventPayload,
} from "../../../../src/agent-team-execution/domain/team-run-event.js";
import { createTeamExecutionAddress } from "../../../../src/agent-team-execution/domain/team-execution-address.js";
import { AgentRunEventMessageMapper } from "../../../../src/services/agent-streaming/agent-run-event-message-mapper.js";
import { ServerMessageType } from "../../../../src/services/agent-streaming/models.js";
import { convertTeamRunEventToServerMessage } from "../../../../src/services/agent-streaming/team-run-event-websocket-message-mapper.js";

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
    teamRunId: "root-team-run-1",
    recipientAddress: createTeamExecutionAddress(executionAddress),
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
    teamRunId: "root-team-run-1",
    executionAddress,
    data: payload,
  };
};

describe("TeamRun member-input WebSocket identity", () => {
  it.each([
    ["persistent", []],
    ["task-Team member", ["task-team-outer", "task-team-inner"]],
  ] as const)("carries the unchanged exact %s execution address", (_label, taskTeamRunIds) => {
    const event = memberInputEvent(taskTeamRunIds);
    const message = convertTeamRunEventToServerMessage(event, new AgentRunEventMessageMapper());

    expect(message.type).toBe(ServerMessageType.MEMBER_INPUT_MESSAGE);
    expect(message.payload.execution_address).toBe(event.executionAddress);
    expect(message.payload).toEqual(expect.objectContaining({
      execution_address: event.executionAddress,
      recipient_address: event.executionAddress,
      content: "You received a message from Teacher.",
      input_origin: "inter_agent_delivery",
      parent_communication_message_id: "team-message-1",
    }));
  });
});
