import { describe, expect, it } from "vitest";
import { AgentRunEventType, type AgentRunEvent } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { MessageFileReferenceProcessor } from "../../../../src/agent-execution/events/processors/message-file-reference/message-file-reference-processor.js";
import {
  extractMessageFileReferencePathCandidates,
  isValidMessageFileReferencePathCandidate,
} from "../../../../src/agent-execution/events/processors/message-file-reference/message-file-reference-paths.js";

const runtimeMarkdownBoldPath = "/Users/normy/.autobyteus/server-data/temp_workspace/math_problem.txt";

describe("message file reference path extraction", () => {
  it("extracts unique absolute local file paths and rejects non-reference text", () => {
    const content = [
      "Valid POSIX: /tmp/report.md,",
      "Valid markdown link: [evidence](/Users/normy/project/evidence_extract.md).",
      "Valid Windows: C:\\Users\\normy\\Desktop\\chart.png",
      "Duplicate should be ignored: /tmp/report.md",
      "Relative should be ignored: src/relative.md",
      "URL should be ignored: https://example.com/tmp/report.md",
      "Route template should be ignored: /runs/:runId/file-change-content?path=/tmp/not-a-reference.md",
      "Directory-looking path should be ignored: /Users/normy/project/output",
    ].join("\n");

    expect(extractMessageFileReferencePathCandidates(content)).toEqual([
      "/tmp/report.md",
      "/Users/normy/project/evidence_extract.md",
      "C:/Users/normy/Desktop/chart.png",
    ]);
  });

  it("rejects null-byte content and route-template candidates", () => {
    expect(extractMessageFileReferencePathCandidates("/tmp/report.md\0/tmp/other.md")).toEqual([]);
    expect(isValidMessageFileReferencePathCandidate("/runs/:runId/file-change-content")).toBe(false);
    expect(isValidMessageFileReferencePathCandidate("/tmp/report.md")).toBe(true);
  });

  it("extracts absolute paths wrapped directly in Markdown emphasis delimiters without persisting delimiters", () => {
    expect(extractMessageFileReferencePathCandidates(`**${runtimeMarkdownBoldPath}**`)).toEqual([
      runtimeMarkdownBoldPath,
    ]);
    expect(extractMessageFileReferencePathCandidates(`*${runtimeMarkdownBoldPath}*`)).toEqual([
      runtimeMarkdownBoldPath,
    ]);
    expect(extractMessageFileReferencePathCandidates(`__${runtimeMarkdownBoldPath}__`)).toEqual([
      runtimeMarkdownBoldPath,
    ]);
  });

  it("extracts common markdown, quote, blockquote, list, and inline-code wrapped full paths", () => {
    const codePath = "/Users/normy/.autobyteus/server-data/temp_workspace/inline_code.txt";
    const quotedPath = "/Users/normy/.autobyteus/server-data/temp_workspace/quoted_file.txt";
    const linkPath = "/Users/normy/.autobyteus/server-data/temp_workspace/link_target.txt";

    expect(extractMessageFileReferencePathCandidates([
      `> **${runtimeMarkdownBoldPath}**`,
      `- \`${codePath}\``,
      `Quoted "${quotedPath}".`,
      `[open file](${linkPath})`,
    ].join("\n"))).toEqual([
      runtimeMarkdownBoldPath,
      codePath,
      quotedPath,
      linkPath,
    ]);
  });
});

describe("MessageFileReferenceProcessor", () => {
  it("derives declaration events from team inter-agent messages only", () => {
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
        content: "Please use /tmp/report.md and /tmp/chart.png.",
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
            content: "Please use /tmp/report.md.",
            message_type: "handoff",
          },
          statusHint: null,
        },
      ],
    })).toEqual([]);
  });

  it("derives one declaration event for the runtime Markdown-bolded inter-agent message path shape", () => {
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
        content: [
          "Hello student!",
          "",
          "You can find it at:",
          `**${runtimeMarkdownBoldPath}**`,
          "",
          "It's an Elliptic Curve Discrete Logarithm problem.",
        ].join("\n"),
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
        path: runtimeMarkdownBoldPath,
        type: "file",
        messageType: "agent_message",
      },
    });
  });
});
