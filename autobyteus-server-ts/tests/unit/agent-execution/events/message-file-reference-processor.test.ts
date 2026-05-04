import { describe, expect, it } from "vitest";
import { AgentRunEventType, type AgentRunEvent } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { MessageFileReferenceProcessor } from "../../../../src/agent-execution/events/processors/message-file-reference/message-file-reference-processor.js";
import {
  normalizeExplicitMessageFileReferencePaths,
} from "../../../../src/services/message-file-references/message-file-reference-explicit-paths.js";

const runtimeSamplePath = "/Users/normy/.autobyteus/server-data/temp_workspace/math_problem.txt";

describe("explicit message file reference path normalization", () => {
  it("normalizes, trims, and dedupes explicit reference_files absolute paths", () => {
    expect(normalizeExplicitMessageFileReferencePaths([
      ` ${runtimeSamplePath} `,
      runtimeSamplePath,
      "C:\\Users\\normy\\Desktop\\chart.png",
    ])).toEqual({
      ok: true,
      referenceFiles: [
        runtimeSamplePath,
        "C:/Users/normy/Desktop/chart.png",
      ],
    });
  });

  it("rejects malformed explicit reference_files lists", () => {
    expect(normalizeExplicitMessageFileReferencePaths("/tmp/report.md")).toMatchObject({ ok: false });
    expect(normalizeExplicitMessageFileReferencePaths(["relative/report.md"])).toMatchObject({ ok: false });
    expect(normalizeExplicitMessageFileReferencePaths(["https://example.com/report.md"])).toMatchObject({ ok: false });
    expect(normalizeExplicitMessageFileReferencePaths(["/tmp/report.md\0"])).toMatchObject({ ok: false });
    expect(normalizeExplicitMessageFileReferencePaths(["/runs/:runId/file-change-content"])).toMatchObject({ ok: false });
  });
});

describe("MessageFileReferenceProcessor", () => {
  it("derives declaration events only from explicit INTER_AGENT_MESSAGE reference_files", () => {
    const processor = new MessageFileReferenceProcessor();
    const sourceEvent: AgentRunEvent = {
      eventType: AgentRunEventType.INTER_AGENT_MESSAGE,
      runId: "receiver-run-1",
      payload: {
        team_run_id: "team-1",
        receiver_run_id: "receiver-run-1",
        sender_agent_id: "sender-run-1",
        sender_agent_name: "Reviewer",
        receiver_agent_name: "Worker",
        recipient_role_name: "Worker",
        content: "Please review the listed files.",
        reference_files: ["/tmp/report.md", "/tmp/chart.png", "/tmp/report.md"],
        message_type: "handoff",
      },
      statusHint: null,
    };

    const derived = processor.process({
      runContext: {} as any,
      events: [sourceEvent],
      sourceEvents: [
        sourceEvent,
        {
          eventType: AgentRunEventType.SEGMENT_CONTENT,
          runId: "receiver-run-1",
          payload: { content: "/tmp/ignored.md" },
          statusHint: null,
        },
      ],
    });

    expect(derived).toHaveLength(2);
    expect(derived[0]).toMatchObject({
      eventType: AgentRunEventType.MESSAGE_FILE_REFERENCE_DECLARED,
      runId: "receiver-run-1",
      statusHint: null,
      payload: {
        teamRunId: "team-1",
        senderRunId: "sender-run-1",
        senderMemberName: "Reviewer",
        receiverRunId: "receiver-run-1",
        receiverMemberName: "Worker",
        messageType: "handoff",
        path: "/tmp/report.md",
        type: "file",
      },
    });
    expect(derived[0].payload.referenceId).toMatch(/^msgref_/);
    expect(derived[0].payload.createdAt).toEqual(expect.any(String));
    expect(derived[0].payload.updatedAt).toBe(derived[0].payload.createdAt);
    expect(derived[1].payload.path).toBe("/tmp/chart.png");
  });

  it("does not scan message content for absolute paths when reference_files is omitted", () => {
    const processor = new MessageFileReferenceProcessor();
    const sourceEvent: AgentRunEvent = {
      eventType: AgentRunEventType.INTER_AGENT_MESSAGE,
      runId: "receiver-run-1",
      payload: {
        team_run_id: "team-1",
        receiver_run_id: "receiver-run-1",
        sender_agent_id: "sender-run-1",
        content: `This prose mentions ${runtimeSamplePath}, but it was not explicitly referenced.`,
        message_type: "handoff",
      },
      statusHint: null,
    };

    expect(processor.process({
      runContext: {} as any,
      events: [sourceEvent],
      sourceEvents: [sourceEvent],
    })).toEqual([]);
  });

  it("does not derive references when required team-message identity is missing", () => {
    const processor = new MessageFileReferenceProcessor();

    expect(processor.process({
      runContext: {} as any,
      events: [],
      sourceEvents: [
        {
          eventType: AgentRunEventType.INTER_AGENT_MESSAGE,
          runId: "receiver-run-1",
          payload: {
            sender_agent_id: "sender-run-1",
            content: "Please use the listed file.",
            reference_files: ["/tmp/report.md"],
            message_type: "handoff",
          },
          statusHint: null,
        },
      ],
    })).toEqual([]);
  });

  it("derives one declaration event for the runtime sample path when supplied through reference_files", () => {
    const processor = new MessageFileReferenceProcessor();
    const sourceEvent: AgentRunEvent = {
      eventType: AgentRunEventType.INTER_AGENT_MESSAGE,
      runId: "student_76dcd8a8a6f6fdee",
      payload: {
        team_run_id: "team_classroomsimulation_4dcfd073",
        receiver_run_id: "student_76dcd8a8a6f6fdee",
        sender_agent_id: "professor_05df570f0f24846d",
        sender_agent_name: "professor",
        receiver_agent_name: "student",
        recipient_role_name: "student",
        content: "Hello student! The reference file is listed separately.",
        reference_files: [runtimeSamplePath],
        message_type: "agent_message",
      },
      statusHint: null,
    };

    const derived = processor.process({
      runContext: {} as any,
      events: [sourceEvent],
      sourceEvents: [sourceEvent],
    });

    expect(derived).toHaveLength(1);
    expect(derived[0]).toMatchObject({
      eventType: AgentRunEventType.MESSAGE_FILE_REFERENCE_DECLARED,
      runId: "student_76dcd8a8a6f6fdee",
      payload: {
        teamRunId: "team_classroomsimulation_4dcfd073",
        senderRunId: "professor_05df570f0f24846d",
        senderMemberName: "professor",
        receiverRunId: "student_76dcd8a8a6f6fdee",
        receiverMemberName: "student",
        path: runtimeSamplePath,
        type: "file",
        messageType: "agent_message",
      },
    });
  });
});
