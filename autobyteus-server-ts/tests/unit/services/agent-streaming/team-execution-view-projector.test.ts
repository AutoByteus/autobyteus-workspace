import { createTeamRootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createTeamAgentExecutionBinding } from "../../../../src/agent-team-execution/domain/team-agent-execution-binding.js";
import { createTeamAgentStatusDetails, createTeamAgentStatusSnapshot } from "../../../../src/agent-team-execution/domain/team-agent-status.js";
import { TeamRunEventSourceType } from "../../../../src/agent-team-execution/domain/team-run-event.js";
import { validateTeamRunExecutionTreePayload } from "../../../../src/run-history/store/team-run-execution-tree-schema.js";
import { validateCollaborationCommunicationMessageArray } from "../../../../src/agent-collaboration/execution/communication/collaboration-communication-message-schema.js";
import { projectSequencedTeamRunEvent, projectTeamExecutionViewSnapshot } from "../../../../src/services/agent-streaming/team-execution-view-projector.js";
import {
  projectLiveTeamAgentStatusMessage,
  projectTeamAgentStatusSnapshotDto,
} from "../../../../src/services/agent-streaming/team-agent-status-websocket-projector.js";

const scenarioDir = path.resolve(
  process.cwd(),
  "tests/fixtures/current-team-run-v2/case-001-delegated-task-team-forest",
);
const recordsDir = path.resolve(
  process.cwd(),
  "tests/fixtures/app-data-migrations/team-run-execution-tree-v1/case-003-nested-task-team",
);
const json = (dir: string, name: string) => JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")) as unknown;
const tree = validateTeamRunExecutionTreePayload(json(scenarioDir, "team_run_execution_tree.json"), "team-run-root");
const messages = Object.freeze({
  schemaVersion: 1 as const,
  rootTeamRunId: "team-run-root",
  messages: validateCollaborationCommunicationMessageArray((json(recordsDir, "team_communication_messages.json") as { messages: unknown }).messages),
});
const message = messages.messages[0]!;
const root = {
  getExecutionTreeSnapshot: () => tree,
};

describe("Team execution view strict projection", () => {
  it("keeps snapshot placement identity out of the exact live status payload", () => {
    const status = createTeamAgentStatusSnapshot({
      execution: createTeamAgentExecutionBinding({
        root: createTeamRootExecutionIdentity("team-run-root"),
        memberAddress: "/qa/automation/tester",
        agentRunId: "nested-task-agent-run-001",
      }),
      details: createTeamAgentStatusDetails({ status: "running", backgroundTasksRunning: 0, trigger: "turn_started" }),
    });

    expect(projectTeamAgentStatusSnapshotDto(status)).toEqual({
      agent_run_id: "nested-task-agent-run-001",
      member_address: "/qa/automation/tester",
      status: "running",
      background_tasks_running: 0,
      trigger: "turn_started",
      tool_name: null,
      error_message: null,
      error_details: null,
      recoverableBlock: null,
    });
    expect(projectLiveTeamAgentStatusMessage(status, 18)).toEqual({
      type: "AGENT_STATUS",
      payload: {
        change_sequence: 18,
        agent_run_id: "nested-task-agent-run-001",
        status: "running",
        background_tasks_running: 0,
        trigger: "turn_started",
        tool_name: null,
        error_message: null,
        error_details: null,
        recoverableBlock: null,
      },
    });
  });

  it("projects live status and the following Agent event contiguously through strict admission", () => {
    const execution = createTeamAgentExecutionBinding({
      root: createTeamRootExecutionIdentity("team-run-root"),
      memberAddress: "/qa/automation/tester",
      agentRunId: "nested-task-agent-run-001",
    });
    expect(projectSequencedTeamRunEvent({
      changeSequence: 22,
      event: {
        eventSourceType: TeamRunEventSourceType.AGENT,
        execution,
        payload: {
          eventType: "AGENT_STATUS",
          statusHint: "running",
          details: createTeamAgentStatusDetails({ status: "running", backgroundTasksRunning: 0, trigger: "turn_started" }),
        },
      },
    })).toMatchObject({ type: "AGENT_STATUS", payload: { change_sequence: 22 } });
    expect(projectSequencedTeamRunEvent({
      changeSequence: 23,
      event: {
        eventSourceType: TeamRunEventSourceType.AGENT,
        execution,
        payload: {
          eventType: "TURN_STARTED",
          statusHint: "running",
          details: { turnId: "turn-1" },
        },
      },
    })).toEqual({
      type: "TURN_STARTED",
      payload: { change_sequence: 23, agent_run_id: execution.agentRunId, turn_id: "turn-1" },
    });
  });

  it("projects exact current AgentRun identity for provider segment events", () => {
    const projected = projectSequencedTeamRunEvent({
      changeSequence: 18,
      event: {
        eventSourceType: TeamRunEventSourceType.AGENT,
        execution: createTeamAgentExecutionBinding({
          root: createTeamRootExecutionIdentity("team-run-root"),
          memberAddress: "/qa/automation/tester",
          agentRunId: "nested-task-agent-run-001",
        }),
        payload: {
          eventType: "SEGMENT_CONTENT",
          statusHint: null,
          occurredAt: 1795452909697,
          details: { segmentId: "segment-1", turnId: "turn-1", segmentType: "text", delta: "hello" },
        },
      },
    });
    expect(projected).toEqual({
      type: "SEGMENT_CONTENT",
      payload: {
        change_sequence: 18,
        agent_run_id: "nested-task-agent-run-001",
        segment_id: "segment-1",
        turn_id: "turn-1",
        segment_type: "text",
        delta: "hello",
        occurred_at: "2026-11-23T16:55:09.697Z",
      },
    });
  });

  it("projects exact same-root communication and recipient input correlation", () => {
    expect(projectSequencedTeamRunEvent({
      changeSequence: 20,
      event: { eventSourceType: TeamRunEventSourceType.COMMUNICATION, payload: message },
    })).toMatchObject({
      type: "TEAM_COMMUNICATION_MESSAGE",
      payload: { change_sequence: 20, message: { message_id: "message-010" } },
    });

    expect(projectSequencedTeamRunEvent({
      changeSequence: 21,
      event: {
        eventSourceType: TeamRunEventSourceType.MEMBER_INPUT,
        agentRunId: "task-team-agent-run-qa-lead-001",
        payload: {
          recipientAgentRunId: "task-team-agent-run-qa-lead-001",
          messageId: "input-1",
          dedupeKey: "input:1",
          content: "reply",
          inputOrigin: "inter_agent_delivery",
          receivedAt: "2026-08-15T00:00:00.000Z",
          contextFilePaths: [],
          senderAgentRunId: "nested-task-agent-run-001",
          parentCommunicationMessageId: "message-010",
        },
      },
    })).toMatchObject({
      type: "MEMBER_INPUT_MESSAGE",
      payload: {
        change_sequence: 21,
        recipient_agent_run_id: "task-team-agent-run-qa-lead-001",
        sender_agent_run_id: "nested-task-agent-run-001",
        parent_communication_message_id: "message-010",
      },
    });
  });
});
