import { describe, expect, it, vi } from "vitest";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { publishProcessedTeamAgentEvents } from "../../../src/agent-team-execution/services/publish-processed-team-agent-events.js";
import { TeamRunEventSourceType, type TeamRunAgentEventPayload } from "../../../src/agent-team-execution/domain/team-run-event.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

describe("publishProcessedTeamAgentEvents", () => {
  it("publishes manually built team-agent events after running the agent event pipeline", async () => {
    const sourceEvent: AgentRunEvent = {
      eventType: AgentRunEventType.INTER_AGENT_MESSAGE,
      runId: "member-run-1",
      payload: { content: "Please use /tmp/report.md" },
      statusHint: null,
    };
    const derivedEvent: AgentRunEvent = {
      eventType: AgentRunEventType.MESSAGE_FILE_REFERENCE_DECLARED,
      runId: "member-run-1",
      payload: { referenceId: "ref-1", path: "/tmp/report.md" },
      statusHint: null,
    };
    const pipeline = {
      process: vi.fn(async () => [sourceEvent, derivedEvent]),
    };
    const publishTeamEvent = vi.fn();
    const runContext = { runId: "member-run-1" } as any;

    await publishProcessedTeamAgentEvents({
      teamRunId: "team-1",
      runContext,
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      memberName: "Worker",
      memberRunId: "member-run-1",
      agentEvents: [sourceEvent],
      publishTeamEvent,
      pipeline: pipeline as any,
    });

    expect(pipeline.process).toHaveBeenCalledWith({
      runContext,
      events: [sourceEvent],
    });
    expect(publishTeamEvent).toHaveBeenCalledTimes(2);
    expect(publishTeamEvent.mock.calls.map((call) => call[0])).toEqual([
      expect.objectContaining({
        eventSourceType: TeamRunEventSourceType.AGENT,
        teamRunId: "team-1",
        data: expect.objectContaining({
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          memberName: "Worker",
          memberRunId: "member-run-1",
          agentEvent: sourceEvent,
        } satisfies Partial<TeamRunAgentEventPayload>),
      }),
      expect.objectContaining({
        eventSourceType: TeamRunEventSourceType.AGENT,
        teamRunId: "team-1",
        data: expect.objectContaining({
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          memberName: "Worker",
          memberRunId: "member-run-1",
          agentEvent: derivedEvent,
        } satisfies Partial<TeamRunAgentEventPayload>),
      }),
    ]);
  });

  it("does not invoke the pipeline for an empty synthetic event batch", async () => {
    const pipeline = {
      process: vi.fn(),
    };
    const publishTeamEvent = vi.fn();

    await publishProcessedTeamAgentEvents({
      teamRunId: "team-1",
      runContext: {} as any,
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      memberName: "Worker",
      memberRunId: "member-run-1",
      agentEvents: [],
      publishTeamEvent,
      pipeline: pipeline as any,
    });

    expect(pipeline.process).not.toHaveBeenCalled();
    expect(publishTeamEvent).not.toHaveBeenCalled();
  });
});
