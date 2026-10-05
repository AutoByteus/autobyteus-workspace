import { describe, expect, it } from "vitest";
import { createTeamRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { projectAgentPresentationMessage } from "../../../src/agent-collaboration/execution/events/agent-presentation-message-projector.js";
import { AgentRunPresentationAdapter } from "../../../src/agent-collaboration/execution/events/collaboration-agent-presentation-adapter.js";
import { buildBackgroundTaskUpdatedPayload } from "../../../src/agent-execution/domain/agent-background-task.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { createTeamAgentExecutionBinding } from "../../../src/agent-team-execution/domain/team-agent-execution-binding.js";
import { TeamAgentEventAdapter } from "../../../src/agent-team-execution/services/team-agent-event-adapter.js";
import { projectTeamAgentEventMessage } from "../../../src/services/agent-streaming/team-agent-event-websocket-projector.js";

const runId = "claude-member-run";
const execution = createTeamAgentExecutionBinding({
  root: createTeamRootExecutionIdentity("root-team-run"),
  memberAddress: "/Researcher",
  agentRunId: runId,
});
const payload = buildBackgroundTaskUpdatedPayload({
  taskId: "bg-1",
  kind: "subagent",
  description: "Research lighthouses",
  command: "rg -n lighthouse docs",
  status: "running",
  summary: null,
  startedAt: "2026-09-29T16:48:20.000Z",
});
const event: AgentRunEvent = { eventType: AgentRunEventType.BACKGROUND_TASK_UPDATED, runId, payload, statusHint: null };

describe("BACKGROUND_TASK_UPDATED collaboration admission", () => {
  it("projects a member's task snapshot onto the Team stream with that member's execution identity (AC-009)", () => {
    const admitted = new TeamAgentEventAdapter(() => execution).adapt(event);
    if (admitted.kind !== "publish") throw new Error(`Unexpected admission result: ${JSON.stringify(admitted)}`);

    expect(admitted.event).toEqual({
      eventType: "BACKGROUND_TASK_UPDATED",
      details: {
        taskId: "bg-1", kind: "subagent", description: "Research lighthouses", command: "rg -n lighthouse docs",
        status: "running", summary: null, startedAt: "2026-09-29T16:48:20.000Z",
      },
      statusHint: null,
    });
    expect(projectTeamAgentEventMessage(execution, admitted.event, 4)).toEqual({
      type: "BACKGROUND_TASK_UPDATED",
      payload: { change_sequence: 4, agent_run_id: runId, ...payload },
    });
  });

  it("projects the same snapshot onto the root-neutral presentation stream", () => {
    const admitted = new AgentRunPresentationAdapter(() => execution).adapt(event);
    if (admitted.kind !== "publish") throw new Error(`Unexpected admission result: ${JSON.stringify(admitted)}`);

    expect(projectAgentPresentationMessage(admitted.event)).toEqual({ type: "BACKGROUND_TASK_UPDATED", payload });
  });

  it("rejects a snapshot that does not match the shared vocabulary", () => {
    const admitted = new AgentRunPresentationAdapter(() => execution).adapt({ ...event, payload: { ...payload, status: "pending" } });

    expect(admitted.kind).toBe("rejected");
  });
});
