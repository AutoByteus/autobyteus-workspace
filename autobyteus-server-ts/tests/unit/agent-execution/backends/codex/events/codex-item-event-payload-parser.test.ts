import { describe, expect, it } from "vitest";
import { CodexItemEventPayloadParser } from "../../../../../../src/agent-execution/backends/codex/events/codex-item-event-payload-parser.js";

describe("CodexItemEventPayloadParser invocation identity", () => {
  it("does not append approval metadata to public invocation ids", () => {
    const parser = new CodexItemEventPayloadParser();

    expect(parser.resolveInvocationId({ itemId: "item_1", approvalId: "approval-1" })).toBe("item_1");
    expect(parser.resolveInvocationId({ invocation_id: "call_1", approval_id: "approval-1" })).toBe("call_1");
    expect(parser.resolveInvocationId({ item: { id: "nested_item" }, approvalId: "approval-2" })).toBe("nested_item");
  });
});
