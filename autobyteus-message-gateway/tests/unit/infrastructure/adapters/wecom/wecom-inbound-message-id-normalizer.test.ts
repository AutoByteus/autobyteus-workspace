import { describe, expect, it } from "vitest";
import { normalizeInboundMessageId } from "../../../../../src/infrastructure/adapters/wecom/wecom-inbound-message-id-normalizer.js";

describe("wecom-inbound-message-id-normalizer", () => {
  it("returns explicit external message id when present", () => {
    expect(
      normalizeInboundMessageId({
        externalMessageId: " msg-123 ",
        text: "hello",
      }),
    ).toBe("msg-123");
  });

  it("builds deterministic hash id when explicit id is missing", () => {
    const left = normalizeInboundMessageId({
      from: "peer-1",
      content: "hello",
      ts: "2026-02-09T10:00:00.000Z",
    });
    const right = normalizeInboundMessageId({
      content: "hello",
      ts: "2026-02-09T10:00:00.000Z",
      from: "peer-1",
    });

    expect(left).toMatch(/^wecom-hash-/);
    expect(left).toBe(right);
  });
});
