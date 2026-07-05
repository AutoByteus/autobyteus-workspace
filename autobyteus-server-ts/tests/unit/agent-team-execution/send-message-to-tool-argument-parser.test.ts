import { describe, expect, it } from "vitest";
import {
  parseSendMessageToToolArguments,
  validateParsedSendMessageToToolArguments,
} from "../../../src/agent-communication/services/send-message-to-tool-argument-parser.js";

const reportPath = "/Users/normy/project/report.md";

describe("send-message-to-tool-argument-parser", () => {
  it("normalizes explicit reference_files while keeping content natural", () => {
    const parsed = parseSendMessageToToolArguments({
      recipient_name: " reviewer ",
      content: " Please review the report. ",
      message_type: "handoff",
      reference_files: [reportPath, ` ${reportPath} `, "C:\\Users\\normy\\Desktop\\chart.png"],
    });

    expect(parsed).toMatchObject({
      recipientName: " reviewer ",
      content: " Please review the report. ",
      messageType: "handoff",
      referenceFiles: [reportPath, "C:/Users/normy/Desktop/chart.png"],
      referenceFilesError: null,
    });
    expect(validateParsedSendMessageToToolArguments("send_message_to", parsed)).toBeNull();
  });

  it("accepts omitted or empty reference_files as no references", () => {
    const omitted = parseSendMessageToToolArguments({
      recipient_name: "reviewer",
      content: "hello",
    });
    const empty = parseSendMessageToToolArguments({
      recipient_name: "reviewer",
      content: "hello",
      reference_files: [],
    });

    expect(omitted.referenceFiles).toEqual([]);
    expect(empty.referenceFiles).toEqual([]);
    expect(validateParsedSendMessageToToolArguments("send_message_to", omitted)).toBeNull();
    expect(validateParsedSendMessageToToolArguments("send_message_to", empty)).toBeNull();
  });

  it("accepts canonical exact-run selector and rejects both canonical selectors", () => {
    const exact = parseSendMessageToToolArguments({
      target_agent_run_id: "run-1",
      content: "hello",
    });
    expect(exact.target).toEqual({
      kind: "target_agent_run_id",
      targetAgentRunId: "run-1",
    });
    expect(validateParsedSendMessageToToolArguments("send_message_to", exact)).toBeNull();

    const both = parseSendMessageToToolArguments({
      recipient_name: "reviewer",
      target_agent_run_id: "run-1",
      content: "hello",
    });
    expect(validateParsedSendMessageToToolArguments("send_message_to", both)).toMatchObject({
      code: "TARGET_SELECTOR_INVALID",
    });
  });

  it("rejects hidden target selector aliases", () => {
    for (const alias of ["recipient", "recipientName", "targetAgentRunId"]) {
      const parsed = parseSendMessageToToolArguments({
        [alias]: alias === "targetAgentRunId" ? "run-1" : "reviewer",
        content: "hello",
      });

      expect(validateParsedSendMessageToToolArguments("send_message_to", parsed)).toEqual({
        code: "UNSUPPORTED_TARGET_SELECTOR_ALIAS",
        message: `send_message_to target selector fields must use recipient_name or target_agent_run_id only. Unsupported field(s): ${alias}.`,
      });
    }
  });

  it("fails malformed reference_files before delivery", () => {
    const parsed = parseSendMessageToToolArguments({
      recipient_name: "reviewer",
      content: "hello",
      reference_files: ["relative/report.md"],
    });

    expect(validateParsedSendMessageToToolArguments("send_message_to", parsed)).toEqual({
      code: "INVALID_REFERENCE_FILES",
      message: "send_message_to reference_files must be an array of absolute local file path strings. Invalid path must be absolute.",
    });
  });

  it("rejects absolute-looking reference_files containing URL protocol markers before delivery", () => {
    const parsed = parseSendMessageToToolArguments({
      recipient_name: "reviewer",
      content: "hello",
      reference_files: ["/tmp/https://example.com/report.md"],
    });

    expect(validateParsedSendMessageToToolArguments("send_message_to", parsed)).toEqual({
      code: "INVALID_REFERENCE_FILES",
      message: "send_message_to reference_files must be an array of absolute local file path strings. Invalid path must be a local filesystem path, not a URL or protocol path.",
    });
  });
});
