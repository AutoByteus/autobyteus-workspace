import { describe, expect, it } from "vitest";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { createTeamAgentExecutionBinding } from "../../../src/agent-team-execution/domain/team-agent-execution-binding.js";
import { TeamAgentEventAdapter } from "../../../src/agent-team-execution/services/team-agent-event-adapter.js";
import { projectTeamAgentEventMessage } from "../../../src/services/agent-streaming/team-agent-event-websocket-projector.js";

const runId = "team-member-run";
const execution = createTeamAgentExecutionBinding({
  rootTeamRunId: "root-team-run",
  memberAddress: "/Researcher",
  agentRunId: runId,
});

describe("Team SYSTEM_INSTRUCTIONS_SUPPLIED admission", () => {
  it("preserves the canonical payload and adds only Team routing fields", () => {
    const content = "  exact team prompt\n\nwith spacing  ";
    const event: AgentRunEvent = {
      eventType: AgentRunEventType.SYSTEM_INSTRUCTIONS_SUPPLIED,
      runId,
      payload: { trace_id: "raw-team-system-id", content, ts: 42.25 },
      statusHint: null,
    };

    const admitted = new TeamAgentEventAdapter(() => execution).adapt(event);
    expect(admitted.kind).toBe("publish");
    if (admitted.kind !== "publish") throw new Error(`Unexpected admission result: ${JSON.stringify(admitted)}`);
    expect(admitted.event).toEqual({
      eventType: "SYSTEM_INSTRUCTIONS_SUPPLIED",
      details: { traceId: "raw-team-system-id", content, ts: 42.25 },
      statusHint: null,
    });
    expect(projectTeamAgentEventMessage(execution, admitted.event, 7)).toEqual({
      type: "SYSTEM_INSTRUCTIONS_SUPPLIED",
      payload: {
        change_sequence: 7,
        agent_run_id: runId,
        trace_id: "raw-team-system-id",
        content,
        ts: 42.25,
      },
    });
  });

  it("rejects non-canonical extra payload fields", () => {
    const admitted = new TeamAgentEventAdapter(() => execution).adapt({
      eventType: AgentRunEventType.SYSTEM_INSTRUCTIONS_SUPPLIED,
      runId,
      payload: { trace_id: "raw-team-system-id", content: "prompt", ts: 42.25, turn_id: "turn-1" },
      statusHint: null,
    });

    expect(admitted).toEqual(expect.objectContaining({ kind: "rejected" }));
  });
});

