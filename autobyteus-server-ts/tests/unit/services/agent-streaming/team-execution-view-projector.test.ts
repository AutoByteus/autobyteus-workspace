import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createTeamAgentExecutionBinding } from "../../../../src/agent-team-execution/domain/team-agent-execution-binding.js";
import { createTeamAgentStatusDetails, createTeamAgentStatusSnapshot } from "../../../../src/agent-team-execution/domain/team-agent-status.js";
import { TeamRunEventSourceType } from "../../../../src/agent-team-execution/domain/team-run-event.js";
import { validateTaskDelegationRecordsV1Payload } from "../../../../src/agent-team-execution/task-delegation/records/task-delegation-records-v1-schema.js";
import { validateTeamRunExecutionTreePayload } from "../../../../src/run-history/store/team-run-execution-tree-schema.js";
import { validateTeamCommunicationMessagesV1Payload } from "../../../../src/services/team-communication/team-communication-v1-schema.js";
import { projectSequencedTeamRunEvent, projectTeamExecutionViewSnapshot } from "../../../../src/services/agent-streaming/team-execution-view-projector.js";

const scenarioDir = path.resolve(
  process.cwd(),
  "tests/fixtures/app-data-migrations/team-run-execution-tree-v1/case-003-nested-task-team",
);
const json = (name: string) => JSON.parse(fs.readFileSync(path.join(scenarioDir, name), "utf8")) as unknown;
const tree = validateTeamRunExecutionTreePayload(json("team_run_execution_tree.json"), "team-run-root");
const tasks = validateTaskDelegationRecordsV1Payload(json("task_delegation_records.json"), "team-run-root");
const messages = validateTeamCommunicationMessagesV1Payload(json("team_communication_messages.json"), "team-run-root");
const task = tasks.records[1]!;
const message = messages.messages[0]!;
const root = {
  getExecutionTreeSnapshot: () => tree,
  getTaskRecordsSnapshot: () => tasks,
};

describe("Team execution view strict projection", () => {
  it("projects one atomic initial V1 execution/task/message/status snapshot", () => {
    const status = createTeamAgentStatusSnapshot({
      execution: createTeamAgentExecutionBinding({
        rootTeamRunId: "team-run-root",
        memberAddress: "/qa/automation/tester",
        agentRunId: "nested-task-agent-run-001",
      }),
      details: createTeamAgentStatusDetails({ status: "running", trigger: "turn_started" }),
    });
    const projected = projectTeamExecutionViewSnapshot("team-run-root", {
      tree, tasks, messages, statuses: [status],
    }, 17);

    expect(projected).toMatchObject({
      type: "TEAM_EXECUTION_VIEW_SNAPSHOT",
      payload: {
        root_team_run_id: "team-run-root",
        base_change_sequence: 17,
        execution_tree: {
          root_team: {
            team_run_id: "team-run-root",
            task_executions: [{
              kind: "task_team",
              team_run_id: "task-team-run-qa-001",
              members: expect.arrayContaining([expect.objectContaining({
                kind: "task_team_member",
                team_run_id: "task-team-run-automation-001",
              })]),
            }],
          },
        },
        tasks: expect.arrayContaining([expect.objectContaining({
          task_id: "task-011",
          task_execution: { agent_run_id: "nested-task-agent-run-001" },
        })]),
        messages: [expect.objectContaining({
          sender_agent_run_id: "nested-task-agent-run-001",
          receiver_agent_run_id: "task-team-agent-run-qa-lead-001",
        })],
        agent_statuses: [expect.objectContaining({
          agent_run_id: "nested-task-agent-run-001",
          member_address: "/qa/automation/tester",
          status: "running",
        })],
      },
    });
  });

  it("projects exact current AgentRun identity for provider segment events", () => {
    const projected = projectSequencedTeamRunEvent(root as never, {
      changeSequence: 18,
      event: {
        eventSourceType: TeamRunEventSourceType.AGENT,
        execution: createTeamAgentExecutionBinding({
          rootTeamRunId: "team-run-root",
          memberAddress: "/qa/automation/tester",
          agentRunId: "nested-task-agent-run-001",
        }),
        payload: {
          eventType: "SEGMENT_CONTENT",
          statusHint: null,
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
      },
    });
  });

  it("locates a nested task Agent under its concrete containing task TeamRun", () => {
    const projected = projectSequencedTeamRunEvent(root as never, {
      changeSequence: 19,
      event: {
        eventSourceType: TeamRunEventSourceType.TASK_DELEGATION,
        taskExecution: task.taskExecution,
        payload: {
          eventType: "TASK_DELEGATION_ACTIVATED",
          details: {
            taskId: task.taskId,
            delegatorAgentRunId: task.delegatorAgentRunId,
            recipientAddress: task.recipientAddress,
            taskExecution: task.taskExecution,
            description: task.description,
            referenceFiles: task.referenceFiles,
            createdAt: task.createdAt,
          },
        },
      },
    });
    expect(projected).toMatchObject({
      type: "TASK_DELEGATION_EVENT",
      payload: {
        event_type: "TASK_AGENT_ACTIVATED",
        change_sequence: 19,
        parent_team_run_id: "task-team-run-automation-001",
        execution: {
          kind: "task_agent",
          address: "/qa/automation/tester",
          agent_run_id: "nested-task-agent-run-001",
        },
      },
    });
  });

  it("projects exact same-root communication and recipient input correlation", () => {
    expect(projectSequencedTeamRunEvent(root as never, {
      changeSequence: 20,
      event: { eventSourceType: TeamRunEventSourceType.COMMUNICATION, payload: message },
    })).toMatchObject({
      type: "TEAM_COMMUNICATION_MESSAGE",
      payload: { change_sequence: 20, message: { message_id: "message-010" } },
    });

    expect(projectSequencedTeamRunEvent(root as never, {
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
