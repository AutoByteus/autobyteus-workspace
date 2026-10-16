import { describe, expect, it } from "vitest";
import { buildSendMessageTargetSelector } from "../../../src/agent-communication/domain/send-message-target-selector.js";

describe("send_message_to target selector refusals (SR-009, wording §7.3 / views §12)", () => {
  it("both selectors: takes exactly one, and says to answer with the sender id", () => {
    expect(buildSendMessageTargetSelector({ recipientAddress: "/project_task_manager", targetAgentRunId: "project_task_manager_3c9e" })).toEqual({
      ok: false,
      message: "send_message_to takes exactly one of recipient_address or target_agent_run_id, not both. To answer a message or report your task result, use send_message_to with target_agent_run_id set to the sender run ID.",
    });
  });

  it("no selector: needs one, and says to answer with the sender id", () => {
    expect(buildSendMessageTargetSelector({})).toEqual({
      ok: false,
      message: "send_message_to needs one of recipient_address or target_agent_run_id. To answer a message or report your task result, use send_message_to with target_agent_run_id set to the sender run ID.",
    });
  });

  it("one selector is accepted as before", () => {
    expect(buildSendMessageTargetSelector({ targetAgentRunId: " run-1 " })).toEqual({ ok: true, target: { kind: "target_agent_run_id", targetAgentRunId: "run-1" } });
    expect(buildSendMessageTargetSelector({ recipientAddress: "/a" })).toEqual({ ok: true, target: { kind: "recipient_address", recipientAddress: "/a" } });
  });
});
