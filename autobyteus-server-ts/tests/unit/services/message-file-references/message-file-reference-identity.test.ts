import { describe, expect, it } from "vitest";
import {
  buildMessageFileReferenceId,
  normalizeMessageFileReferencePath,
} from "../../../../src/services/message-file-references/message-file-reference-identity.js";

describe("message file reference identity", () => {
  it("builds deterministic ids from team, sender, receiver, and normalized path only", () => {
    const base = buildMessageFileReferenceId({
      teamRunId: "team-1",
      senderRunId: "sender-run-1",
      receiverRunId: "receiver-run-1",
      path: "C:\\Users\\normy\\report.md",
    });

    expect(base).toMatch(/^msgref_/);
    expect(buildMessageFileReferenceId({
      teamRunId: "team-1",
      senderRunId: "sender-run-1",
      receiverRunId: "receiver-run-1",
      path: "C:/Users/normy/report.md",
    })).toBe(base);
    expect(buildMessageFileReferenceId({
      teamRunId: "team-1",
      senderRunId: "sender-run-2",
      receiverRunId: "receiver-run-1",
      path: "C:/Users/normy/report.md",
    })).not.toBe(base);
  });

  it("normalizes backslashes without treating names or message type as identity inputs", () => {
    expect(normalizeMessageFileReferencePath("\\tmp\\report.md ")).toBe("/tmp/report.md");
  });
});
