import { describe, expect, it } from "vitest";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import { CodexThreadEventName } from "../../../src/agent-execution/backends/codex/events/codex-thread-event-name.js";
import { createTeamAgentExecutionBinding } from "../../../src/agent-team-execution/domain/team-agent-execution-binding.js";
import { TeamAgentEventAdapter } from "../../../src/agent-team-execution/services/team-agent-event-adapter.js";
import { AgentRunEventMessageMapper } from "../../../src/services/agent-streaming/agent-run-event-message-mapper.js";
import { projectTeamAgentEventMessage } from "../../../src/services/agent-streaming/team-agent-event-websocket-projector.js";
import { createCodexThreadEventHarness } from "../../fixtures/codex-thread-event-harness.js";

describe("Codex command failure transport integration", () => {
  it("preserves one enriched provider-shaped failure through standalone and Team wire paths", () => {
    const runId = "codex-command-failure-run";
    const converted = createCodexThreadEventHarness(runId).emitThroughThread({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: {
        threadId: "thread-command-failure",
        turnId: "turn-command-failure",
        item: {
          id: "exec-command-failure",
          type: "commandExecution",
          command: "/bin/bash -lc 'exit 23'",
          cwd: "/workspace/command-failure",
          status: "failed",
          aggregatedOutput: "first line\nCODEX_FAILURE_STDERR_MARKER",
          exitCode: 23,
        },
      },
    });
    const failure = converted.find(
      (event) => event.eventType === AgentRunEventType.TOOL_EXECUTION_FAILED,
    );
    if (!failure) throw new Error("Expected a failed command runtime event.");

    const expectedFailurePayload = {
      invocation_id: "exec-command-failure",
      turn_id: "turn-command-failure",
      tool_name: "run_bash",
      arguments: {
        command: "/bin/bash -lc 'exit 23'",
        cwd: "/workspace/command-failure",
      },
      error: "first line\nCODEX_FAILURE_STDERR_MARKER\nExit code: 23",
    };
    expect(failure).toMatchObject({
      runId,
      eventType: AgentRunEventType.TOOL_EXECUTION_FAILED,
      payload: expectedFailurePayload,
    });
    expect(failure.payload).not.toHaveProperty("result");

    const standalone = new AgentRunEventMessageMapper().map(failure);
    expect(standalone).toMatchObject({
      type: "TOOL_EXECUTION_FAILED",
      payload: expectedFailurePayload,
    });

    const execution = createTeamAgentExecutionBinding({
      rootTeamRunId: "root-team-command-failure",
      memberAddress: "/implementation_engineer",
      agentRunId: runId,
    });
    const adapted = new TeamAgentEventAdapter(() => execution).adapt(failure);
    expect(adapted.kind).toBe("publish");
    if (adapted.kind !== "publish") {
      throw new Error(`Expected Team admission, received ${JSON.stringify(adapted)}.`);
    }
    const team = projectTeamAgentEventMessage(execution, adapted.event, 17);
    expect(team).toEqual({
      type: "TOOL_EXECUTION_FAILED",
      payload: {
        change_sequence: 17,
        agent_run_id: runId,
        ...expectedFailurePayload,
      },
    });

    expect(team.payload.error).toBe(standalone.payload.error);
    expect(team.payload.invocation_id).toBe(standalone.payload.invocation_id);
    expect(team.payload.turn_id).toBe(standalone.payload.turn_id);
    expect(team.payload.tool_name).toBe(standalone.payload.tool_name);
    expect(team.payload.arguments).toEqual(standalone.payload.arguments);
    expect(standalone.payload.error).not.toContain("{\"item\"");
    expect(team.payload.error).not.toContain("{\"item\"");
  });
});
