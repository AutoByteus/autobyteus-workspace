import { describe, expect, it } from "vitest";
import {
  parseSendMessageToToolArguments,
  validateParsedSendMessageToToolArguments,
} from "../../../src/agent-team-execution/services/send-message-to-tool-argument-parser.js";

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
});
