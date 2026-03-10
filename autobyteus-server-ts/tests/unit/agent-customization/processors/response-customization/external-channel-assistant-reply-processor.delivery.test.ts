import { beforeEach, describe, expect, it, vi } from "vitest";

const publishAssistantReplyByTurnMock = vi.fn().mockResolvedValue({
  published: true,
  duplicate: false,
  reason: null,
  envelope: null,
});
const buildDefaultReplyCallbackServiceMock = vi.fn(() => ({
  publishAssistantReplyByTurn: publishAssistantReplyByTurnMock,
}));

vi.mock(
  "../../../../../src/external-channel/runtime/gateway-callback-delivery-runtime.js",
  () => ({
    buildDefaultReplyCallbackService: buildDefaultReplyCallbackServiceMock,
  }),
);

describe("ExternalChannelAssistantReplyProcessor delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queues assistant replies through the shared callback delivery runtime", async () => {
    const { ExternalChannelAssistantReplyProcessor } = await import(
      "../../../../../src/agent-customization/processors/response-customization/external-channel-assistant-reply-processor.js"
    );

    const processor = new ExternalChannelAssistantReplyProcessor();

    await processor.processResponse(
      {
        content: "What I can do for you as a professor",
        reasoning: "",
        image_urls: [],
        audio_urls: [],
        video_urls: [],
      } as any,
      { agentId: "agent-run-1" } as any,
      { turnId: "turn-1" } as any,
    );

    expect(buildDefaultReplyCallbackServiceMock).toHaveBeenCalledOnce();
    expect(publishAssistantReplyByTurnMock).toHaveBeenCalledWith({
      agentRunId: "agent-run-1",
      turnId: "turn-1",
      replyText: "What I can do for you as a professor",
      callbackIdempotencyKey: "external-reply:agent-run-1:turn-1",
      metadata: {
        audioCount: 0,
        hasReasoning: false,
        imageCount: 0,
        videoCount: 0,
      },
    });
  }, 15_000);
});
