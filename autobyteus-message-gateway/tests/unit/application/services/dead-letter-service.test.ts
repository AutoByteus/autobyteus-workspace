import { describe, expect, it } from "vitest";
import { DeadLetterService } from "../../../../src/application/services/dead-letter-service.js";

describe("DeadLetterService", () => {
  it("records failed outbound payloads", async () => {
    const service = new DeadLetterService();

    await service.recordFailedOutbound(
      {
        provider: "WHATSAPP",
        transport: "BUSINESS_API",
        accountId: "acct-1",
        peerId: "peer-1",
        threadId: null,
        correlationMessageId: "corr-1",
        callbackIdempotencyKey: "cb-1",
        replyText: "done",
        attachments: [],
        chunks: [],
        metadata: {},
      } as any,
      new Error("provider timeout"),
    );

    expect(service.listDeadLetters()).toHaveLength(1);
    expect(service.listDeadLetters()[0]).toMatchObject({
      callbackIdempotencyKey: "cb-1",
      correlationMessageId: "corr-1",
      provider: "WHATSAPP",
      transport: "BUSINESS_API",
      errorMessage: "provider timeout",
    });
  });
});
