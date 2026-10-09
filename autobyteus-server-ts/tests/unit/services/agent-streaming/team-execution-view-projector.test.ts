import { createTeamRootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createTeamAgentExecutionBinding } from "../../../../src/agent-team-execution/domain/team-agent-execution-binding.js";
import { createTeamAgentStatusDetails, createTeamAgentStatusSnapshot } from "../../../../src/agent-team-execution/domain/team-agent-status.js";
import { TeamRunEventSourceType } from "../../../../src/agent-team-execution/domain/team-run-event.js";
import { validateTeamRunExecutionTreePayload } from "../../../../src/run-history/store/team-run-execution-tree-schema.js";
import { taskExecutionsClosedEvent, taskExecutionsReopenedEvent } from "../../../../src/agent-team-execution/task-delegation/task-execution-event-factory.js";
import { AgentTeamRunManager } from "../../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { InMemoryTaskExecutionResources } from "../../../fixtures/task-execution-resource-fixtures.js";
import { validateTeamCommunicationMessagesV1Payload } from "../../../../src/services/team-communication/team-communication-v1-schema.js";
import { projectSequencedTeamRunEvent, projectTeamExecutionViewSnapshot } from "../../../../src/services/agent-streaming/team-execution-view-projector.js";
import {
  projectLiveTeamAgentStatusMessage,
  projectTeamAgentStatusSnapshotDto,
} from "../../../../src/services/agent-streaming/team-agent-status-websocket-projector.js";

const scenarioDir = path.resolve(
  process.cwd(),
  "tests/fixtures/current-team-run-v2/case-001-nested-task-team",
);
const recordsDir = path.resolve(
  process.cwd(),
  "tests/fixtures/app-data-migrations/team-run-execution-tree-v1/case-003-nested-task-team",
);
const json = (dir: string, name: string) => JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")) as unknown;
const tree = validateTeamRunExecutionTreePayload(json(scenarioDir, "team_run_execution_tree.json"), "team-run-root");
const messages = validateTeamCommunicationMessagesV1Payload(json(recordsDir, "team_communication_messages.json"), "team-run-root");
const message = messages.messages[0]!;
const root = {
  getExecutionTreeSnapshot: () => tree,
};

describe("Team execution view strict projection", () => {
  it("carries closed task executions beside the unfiltered tree, and maps the sequenced closed event", () => {
    const closed = [{ teamRunId: "task-team-run-qa-001" }, { agentRunId: "nested-task-agent-run-001" }];
    const projected = projectTeamExecutionViewSnapshot("team-run-root", {
      tree, closedTaskExecutions: closed, messages, statuses: [], inputStates: [],
    }, 3);
    expect(projected.type === "TEAM_EXECUTION_VIEW_SNAPSHOT" && projected.payload.closed_task_executions)
      .toEqual([{ team_run_id: "task-team-run-qa-001" }, { agent_run_id: "nested-task-agent-run-001" }]);
    expect(projected.type === "TEAM_EXECUTION_VIEW_SNAPSHOT" && projected.payload.execution_tree.root_team.task_executions)
      .toHaveLength(tree.rootTeam.taskExecutions.length);
    expect(projectSequencedTeamRunEvent(root as never, { event: taskExecutionsClosedEvent(closed), changeSequence: 4 })).toEqual({
      type: "TASK_EXECUTIONS_CLOSED",
      payload: { change_sequence: 4, task_executions: [{ team_run_id: "task-team-run-qa-001" }, { agent_run_id: "nested-task-agent-run-001" }] },
    });
    // A reactivation is the symmetric sequenced event with the same reference shape.
    expect(projectSequencedTeamRunEvent(root as never, { event: taskExecutionsReopenedEvent([closed[0]!]), changeSequence: 5 })).toEqual({
      type: "TASK_EXECUTIONS_REOPENED",
      payload: { change_sequence: 5, task_executions: [{ team_run_id: "task-team-run-qa-001" }] },
    });
  });

  it("the Team manager reads a root's closed task executions of a given tree through the Task port", async () => {
    const resources = new InMemoryTaskExecutionResources();
    resources.addTask("A");
    const hostRoot = createTeamRootExecutionIdentity("team-run-root");
    await resources.linkNewTaskExecution({ role: "assigned", taskId: "A", assignedBy: "agent-run-product-manager", hostRoot, execution: { teamRunId: "task-team-run-qa-001" } });
    await resources.linkNewTaskExecution({ role: "delegated", creator: { teamRunId: "task-team-run-qa-001" }, hostRoot, execution: { agentRunId: "not-in-tree" } });
    resources.close("A");
    const closedFor = AgentTeamRunManager.prototype.closedTaskExecutionsFor;
    expect(closedFor.call({ taskExecutionResources: resources } as never, "team-run-root", tree)).toEqual([{ teamRunId: "task-team-run-qa-001" }]);
    expect(closedFor.call({} as never, "team-run-root", tree)).toEqual([]);
  });

  it("projects one atomic initial execution/message/status snapshot with delegators and no task records", () => {
    const status = createTeamAgentStatusSnapshot({
      execution: createTeamAgentExecutionBinding({
        root: createTeamRootExecutionIdentity("team-run-root"),
        memberAddress: "/qa/automation/tester",
        agentRunId: "nested-task-agent-run-001",
      }),
      details: createTeamAgentStatusDetails({ status: "running", trigger: "turn_started" }),
    });
    const projected = projectTeamExecutionViewSnapshot("team-run-root", {
      tree, closedTaskExecutions: [], messages, statuses: [status], inputStates: [],
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
              delegator_agent_run_id: "agent-run-product-manager",
              members: expect.arrayContaining([expect.objectContaining({
                kind: "task_team_member",
                team_run_id: "task-team-run-automation-001",
              })]),
            }],
          },
        },
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

  it("keeps the separate snake-case Team protocol identical when dev data carries Task stamps, which the reader drops (C-1)", () => {
    const stamped = JSON.parse(JSON.stringify(tree));
    const parent = stamped.rootTeam.taskExecutions[0];
    parent.taskLifetime = { lifetimeId: "controlled-lifetime", purpose: "assignment" };
    const nested = parent.members.find((member: { teamRunId?: string }) => member.teamRunId === "task-team-run-automation-001");
    nested.taskExecutions[0].taskLifetime = { lifetimeId: "controlled-lifetime", purpose: "delegation" };
    const current = validateTeamRunExecutionTreePayload(stamped, "team-run-root"), before = JSON.stringify(current);
    expect(projectTeamExecutionViewSnapshot("team-run-root", { tree: current, closedTaskExecutions: [], messages, statuses: [], inputStates: [] }, 17))
      .toEqual(projectTeamExecutionViewSnapshot("team-run-root", { tree, closedTaskExecutions: [], messages, statuses: [], inputStates: [] }, 17));
    const event = { changeSequence: 19, event: {
      eventSourceType: TeamRunEventSourceType.TASK_EXECUTION,
      taskExecution: { agentRunId: "nested-task-agent-run-001" },
      payload: { eventType: "TASK_EXECUTION_STARTED", details: { parentTeamRunId: "task-team-run-automation-001" } },
    } };
    expect(projectSequencedTeamRunEvent({ getExecutionTreeSnapshot: () => current } as never, event as never))
      .toEqual(projectSequencedTeamRunEvent(root as never, event as never));
    expect(JSON.stringify(current)).toBe(before);
    expect(before).not.toContain("taskLifetime");
  });

  it("keeps snapshot placement identity out of the exact live status payload", () => {
    const status = createTeamAgentStatusSnapshot({
      execution: createTeamAgentExecutionBinding({
        root: createTeamRootExecutionIdentity("team-run-root"),
        memberAddress: "/qa/automation/tester",
        agentRunId: "nested-task-agent-run-001",
      }),
      details: createTeamAgentStatusDetails({ status: "running", trigger: "turn_started" }),
    });

    expect(projectTeamAgentStatusSnapshotDto(status)).toEqual({
      agent_run_id: "nested-task-agent-run-001",
      member_address: "/qa/automation/tester",
      status: "running",
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
    expect(projectSequencedTeamRunEvent(root as never, {
      changeSequence: 22,
      event: {
        eventSourceType: TeamRunEventSourceType.AGENT,
        execution,
        payload: {
          eventType: "AGENT_STATUS",
          statusHint: "running",
          details: createTeamAgentStatusDetails({ status: "running", trigger: "turn_started" }),
        },
      },
    })).toMatchObject({ type: "AGENT_STATUS", payload: { change_sequence: 22 } });
    expect(projectSequencedTeamRunEvent(root as never, {
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
    const projected = projectSequencedTeamRunEvent(root as never, {
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
        eventSourceType: TeamRunEventSourceType.TASK_EXECUTION,
        taskExecution: { agentRunId: "nested-task-agent-run-001" },
        payload: {
          eventType: "TASK_EXECUTION_STARTED",
          details: { parentTeamRunId: "task-team-run-automation-001" },
        },
      },
    });
    expect(projected).toMatchObject({
      type: "TASK_EXECUTION_STARTED",
      payload: {
        change_sequence: 19,
        parent_team_run_id: "task-team-run-automation-001",
        execution: {
          kind: "task_agent",
          address: "/qa/automation/tester",
          agent_run_id: "nested-task-agent-run-001",
          delegator_agent_run_id: "task-team-agent-run-qa-lead-001",
        },
      },
    });
    expect((projected as { payload: object }).payload).not.toHaveProperty("task");
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
