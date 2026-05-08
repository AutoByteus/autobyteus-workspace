import { describe, expect, it } from "vitest";
import { AgentRunEventType } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { AgentRunContext } from "../../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRunConfig } from "../../../../src/agent-execution/domain/agent-run-config.js";
import { TeamCommunicationMessageProcessor } from "../../../../src/agent-execution/events/processors/team-communication/team-communication-message-event-processor.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";

const runContext = new AgentRunContext({
  runId: "receiver-run-1",
  config: new AgentRunConfig({
    agentDefinitionId: "receiver",
    llmModelIdentifier: "test-model",
    autoExecuteTools: false,
    workspaceId: null,
    memoryDir: null,
    skillAccessMode: SkillAccessMode.NONE,
    runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  }),
  runtimeContext: null,
});

describe("TeamCommunicationMessageProcessor", () => {
  it("emits one normalized message-centric event for an accepted inter-agent message with child references", () => {
    const processor = new TeamCommunicationMessageProcessor();

    const derivedEvents = processor.process({
      runContext,
      events: [],
      sourceEvents: [
        {
          eventType: AgentRunEventType.INTER_AGENT_MESSAGE,
          runId: "receiver-run-1",
          payload: {
            message_id: "message-1",
            team_run_id: "team-1",
            sender_agent_id: "sender-run-1",
            sender_agent_name: "Sender",
            receiver_run_id: "receiver-run-1",
            receiver_agent_name: "Receiver",
            content: "Please review the attached report.",
            message_type: "handoff",
            reference_files: ["/tmp/report.md", "/tmp/report.md", "/tmp/notes.txt"],
            created_at: "2026-04-08T00:00:00.000Z",
          },
          statusHint: null,
        },
      ],
    });

    expect(derivedEvents).toHaveLength(1);
    expect(derivedEvents[0]).toEqual({
      eventType: AgentRunEventType.TEAM_COMMUNICATION_MESSAGE,
      runId: "receiver-run-1",
      payload: expect.objectContaining({
        messageId: "message-1",
        teamRunId: "team-1",
        senderRunId: "sender-run-1",
        senderMemberName: "Sender",
        receiverRunId: "receiver-run-1",
        receiverMemberName: "Receiver",
        content: "Please review the attached report.",
        messageType: "handoff",
        referenceFiles: [
          expect.objectContaining({ path: "/tmp/report.md" }),
          expect.objectContaining({ path: "/tmp/notes.txt" }),
        ],
      }),
      statusHint: null,
    });
  });

  it("does not emit file-first sidecar events or scan prose paths", () => {
    const processor = new TeamCommunicationMessageProcessor();

    const derivedEvents = processor.process({
      runContext,
      events: [],
      sourceEvents: [
        {
          eventType: AgentRunEventType.INTER_AGENT_MESSAGE,
          runId: "receiver-run-1",
          payload: {
            message_id: "message-2",
            team_run_id: "team-1",
            sender_agent_id: "sender-run-1",
            receiver_run_id: "receiver-run-1",
            content: "This body mentions /tmp/not-a-reference.md as prose only.",
            message_type: "handoff",
            created_at: "2026-04-08T00:00:00.000Z",
          },
          statusHint: null,
        },
      ],
    });

    expect(derivedEvents).toHaveLength(1);
    expect(derivedEvents[0]?.eventType).toBe(AgentRunEventType.TEAM_COMMUNICATION_MESSAGE);
    expect(derivedEvents[0]?.payload.referenceFiles).toEqual([]);
  });

  it("skips raw inter-agent messages without required message metadata", () => {
    const processor = new TeamCommunicationMessageProcessor();

    const derivedEvents = processor.process({
      runContext,
      events: [],
      sourceEvents: [
        {
          eventType: AgentRunEventType.INTER_AGENT_MESSAGE,
          runId: "receiver-run-1",
          payload: {
            content: "Legacy-shaped conversation-only event.",
          },
          statusHint: null,
        },
      ],
    });

    expect(derivedEvents).toEqual([]);
  });
});
