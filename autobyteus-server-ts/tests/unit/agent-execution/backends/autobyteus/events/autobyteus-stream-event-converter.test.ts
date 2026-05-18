import { describe, expect, it } from "vitest";
import { StreamEventType } from "autobyteus-ts";
import { AutoByteusStreamEventConverter } from "../../../../../../src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.js";
import { AgentRunEventType } from "../../../../../../src/agent-execution/domain/agent-run-event.js";

describe("AutoByteusStreamEventConverter", () => {
  it.each([
    [StreamEventType.TURN_STARTED, AgentRunEventType.TURN_STARTED],
    [StreamEventType.TURN_COMPLETED, AgentRunEventType.TURN_COMPLETED],
    [StreamEventType.AGENT_STATUS, AgentRunEventType.AGENT_STATUS],
    [StreamEventType.COMPACTION_STATUS, AgentRunEventType.COMPACTION_STATUS],
    [StreamEventType.ASSISTANT_COMPLETE_RESPONSE, AgentRunEventType.ASSISTANT_COMPLETE],
    [StreamEventType.TOOL_APPROVAL_REQUESTED, AgentRunEventType.TOOL_APPROVAL_REQUESTED],
    [StreamEventType.TOOL_APPROVED, AgentRunEventType.TOOL_APPROVED],
    [StreamEventType.TOOL_DENIED, AgentRunEventType.TOOL_DENIED],
    [StreamEventType.TOOL_EXECUTION_STARTED, AgentRunEventType.TOOL_EXECUTION_STARTED],
    [StreamEventType.TOOL_EXECUTION_SUCCEEDED, AgentRunEventType.TOOL_EXECUTION_SUCCEEDED],
    [StreamEventType.TOOL_EXECUTION_FAILED, AgentRunEventType.TOOL_EXECUTION_FAILED],
    [StreamEventType.TOOL_INTERACTION_LOG_ENTRY, AgentRunEventType.TOOL_LOG],
    [StreamEventType.SYSTEM_TASK_NOTIFICATION, AgentRunEventType.SYSTEM_TASK_NOTIFICATION],
    [StreamEventType.INTER_AGENT_MESSAGE, AgentRunEventType.INTER_AGENT_MESSAGE],
    [StreamEventType.AGENT_TODO_LIST_UPDATE, AgentRunEventType.TODO_LIST_UPDATE],
    [StreamEventType.ARTIFACT_PERSISTED, AgentRunEventType.ARTIFACT_PERSISTED],
    [StreamEventType.ERROR_EVENT, AgentRunEventType.ERROR],
  ])("maps %s to %s", (streamEventType, agentRunEventType) => {
    const converter = new AutoByteusStreamEventConverter("run-1");
    const event = converter.convert({
      event_type: streamEventType,
      data: { invocation_id: "inv-1", detail: "ok" },
    } as any);
    const isStatusEvent = streamEventType === StreamEventType.AGENT_STATUS;

    expect(event).toEqual({
      eventType: agentRunEventType,
      runId: "run-1",
      payload: isStatusEvent
        ? { status: "offline", can_interrupt: false }
        : { invocation_id: "inv-1", detail: "ok" },
      statusHint:
        streamEventType === StreamEventType.ERROR_EVENT
          ? "ERROR"
          : streamEventType === StreamEventType.TURN_STARTED
            ? "ACTIVE"
            : streamEventType === StreamEventType.TURN_COMPLETED
              ? "IDLE"
              : isStatusEvent
                ? "IDLE"
              : null,
    });
  });

  it("uses explicit current status payloads before stale snapshots", () => {
    expect(
      new AutoByteusStreamEventConverter("run-1", () => ({
        status: "offline",
        can_interrupt: false,
        agent_id: "run-1",
      })).convert({
        event_type: StreamEventType.AGENT_STATUS,
        data: { status: "idle" },
      } as any),
    )?.toMatchObject({
      eventType: AgentRunEventType.AGENT_STATUS,
      payload: { status: "idle", can_interrupt: false, agent_id: "run-1" },
      statusHint: "IDLE",
    });

    expect(
      new AutoByteusStreamEventConverter("run-1", () => ({
        status: "offline",
        can_interrupt: false,
      })).convert({
        event_type: StreamEventType.AGENT_STATUS,
        data: { status: "error" },
      } as any),
    )?.toMatchObject({
      eventType: AgentRunEventType.AGENT_STATUS,
      payload: { status: "error", can_interrupt: false },
      statusHint: "ERROR",
    });
  });

  it("normalizes explicit fine-grained native statuses through the AutoByteus status projector", () => {
    expect(
      new AutoByteusStreamEventConverter("run-1", () => ({
        status: "offline",
        can_interrupt: false,
        agent_id: "run-1",
      })).convert({
        event_type: StreamEventType.AGENT_STATUS,
        data: { status: "awaiting_tool_approval" },
      } as any),
    )?.toMatchObject({
      eventType: AgentRunEventType.AGENT_STATUS,
      payload: { status: "running", can_interrupt: false, agent_id: "run-1" },
      statusHint: "ACTIVE",
    });
  });

  it("preserves public running status for stale non-active snapshots while a turn is active", () => {
    let snapshotStatus: "idle" | "initializing" = "idle";
    const converter = new AutoByteusStreamEventConverter("run-1", () => ({
      status: snapshotStatus,
      can_interrupt: false,
      agent_id: "run-1",
    }));

    expect(converter.convert({
      event_type: StreamEventType.TURN_STARTED,
      data: { turn_id: "turn-1" },
    } as any))?.toMatchObject({
      eventType: AgentRunEventType.TURN_STARTED,
      statusHint: "ACTIVE",
    });

    expect(converter.convert({
      event_type: StreamEventType.AGENT_STATUS,
      data: {},
    } as any))?.toMatchObject({
      eventType: AgentRunEventType.AGENT_STATUS,
      payload: {
        status: "running",
        can_interrupt: false,
        agent_id: "run-1",
      },
      statusHint: "ACTIVE",
    });

    snapshotStatus = "initializing";
    expect(converter.convert({
      event_type: StreamEventType.AGENT_STATUS,
      data: {},
    } as any))?.toMatchObject({
      eventType: AgentRunEventType.AGENT_STATUS,
      payload: {
        status: "running",
        can_interrupt: false,
        agent_id: "run-1",
      },
      statusHint: "ACTIVE",
    });

    snapshotStatus = "idle";
    expect(converter.convert({
      event_type: StreamEventType.TURN_COMPLETED,
      data: { turn_id: "turn-1" },
    } as any))?.toMatchObject({
      eventType: AgentRunEventType.TURN_COMPLETED,
      statusHint: "IDLE",
    });

    expect(converter.convert({
      event_type: StreamEventType.AGENT_STATUS,
      data: {},
    } as any))?.toMatchObject({
      eventType: AgentRunEventType.AGENT_STATUS,
      payload: {
        status: "idle",
        can_interrupt: false,
        agent_id: "run-1",
      },
      statusHint: "IDLE",
    });
  });

  it("ignores deprecated artifact_updated stream events", () => {
    const converter = new AutoByteusStreamEventConverter("run-1");
    expect(
      converter.convert({
        event_type: StreamEventType.ARTIFACT_UPDATED,
        data: { path: "notes.md" },
      } as any),
    ).toBeNull();
  });

  it("maps segment events into start, content, and end events", () => {
    const converter = new AutoByteusStreamEventConverter("run-1");
    expect(
      converter.convert({
        event_type: StreamEventType.SEGMENT_EVENT,
        data: {
          event_type: "start",
          segment_id: "seg-1",
          segment_type: "assistant_text",
          turn_id: "turn-1",
          payload: { content: "hello" },
        },
      } as any),
    ).toEqual({
      eventType: AgentRunEventType.SEGMENT_START,
      runId: "run-1",
      payload: {
        id: "seg-1",
        turn_id: "turn-1",
        segment_type: "assistant_text",
        content: "hello",
      },
      statusHint: null,
    });

    expect(
      converter.convert({
        event_type: StreamEventType.SEGMENT_EVENT,
        data: {
          event_type: "content",
          segment_id: "seg-2",
          turn_id: "turn-2",
          payload: { text: "chunk" },
        },
      } as any),
    )?.toMatchObject({
      eventType: AgentRunEventType.SEGMENT_CONTENT,
      payload: {
        id: "seg-2",
        turn_id: "turn-2",
        text: "chunk",
      },
    });

    expect(
      converter.convert({
        event_type: StreamEventType.SEGMENT_EVENT,
        data: {
          event_type: "end",
          segment_id: "seg-3",
          turn_id: "turn-3",
        },
      } as any),
    )?.toMatchObject({
      eventType: AgentRunEventType.SEGMENT_END,
      payload: {
        id: "seg-3",
        turn_id: "turn-3",
      },
    });
  });

  it("canonicalizes native segment payloads to turn_id for all segment event variants", () => {
    const converter = new AutoByteusStreamEventConverter("run-1");
    const start = converter.convert({
      event_type: StreamEventType.SEGMENT_EVENT,
      data: {
        event_type: "SEGMENT_START",
        segment_id: "seg-start",
        segment_type: "text",
        turn_id: "turn-native",
        payload: { metadata: { role: "assistant" }, turnId: "legacy-nested" },
      },
    } as any);
    const content = converter.convert({
      event_type: StreamEventType.SEGMENT_EVENT,
      data: {
        event_type: "SEGMENT_CONTENT",
        segment_id: "seg-content",
        turn_id: "turn-native",
        payload: { delta: "partial", turn_id: "nested-wrong" },
      },
    } as any);
    const end = converter.convert({
      event_type: StreamEventType.SEGMENT_EVENT,
      data: {
        event_type: "SEGMENT_END",
        segment_id: "seg-end",
        turn_id: "turn-native",
        payload: {
          interrupted: true,
          reason: "user_interrupt",
          metadata: { tool_name: "search_web" },
          turnId: "legacy-nested",
        },
      },
    } as any);

    for (const event of [start, content, end]) {
      expect(event?.payload).toMatchObject({ turn_id: "turn-native" });
      expect(event?.payload).not.toHaveProperty("turnId");
    }
    expect(start?.payload).toMatchObject({
      id: "seg-start",
      segment_type: "text",
      metadata: { role: "assistant" },
    });
    expect(content?.payload).toMatchObject({ id: "seg-content", delta: "partial" });
    expect(end?.payload).toMatchObject({
      id: "seg-end",
      interrupted: true,
      reason: "user_interrupt",
      metadata: { tool_name: "search_web" },
    });
  });

  it("drops unknown segment types", () => {
    const converter = new AutoByteusStreamEventConverter("run-1");
    expect(
      converter.convert({
        event_type: StreamEventType.SEGMENT_EVENT,
        data: { event_type: "mystery", segment_id: "seg-4", turn_id: "turn-4" },
      } as any),
    ).toBeNull();

    expect(
      converter.convert({
        event_type: StreamEventType.SEGMENT_EVENT,
        data: { event_type: "start", segment_id: "seg-5" },
      } as any),
    ).toBeNull();
  });

  it("keeps native turn lifecycle payloads intact", () => {
    const converter = new AutoByteusStreamEventConverter("run-1");
    expect(
      converter.convert({
        event_type: StreamEventType.TURN_COMPLETED,
        data: { turn_id: "turn-auto-1" },
      } as any),
    ).toEqual({
      eventType: AgentRunEventType.TURN_COMPLETED,
      runId: "run-1",
      payload: { turn_id: "turn-auto-1" },
      statusHint: "IDLE",
    });
  });
});
