import { describe, expect, it } from "vitest";
import { CompleteResponse } from "autobyteus-ts/llm/utils/response-types.js";
import { ExternalChannelReplyContentFormatter } from "../../../../src/external-channel/services/external-channel-reply-content-formatter.js";

describe("ExternalChannelReplyContentFormatter", () => {
  it("returns trimmed text and metadata counters", () => {
    const formatter = new ExternalChannelReplyContentFormatter();

    const formatted = formatter.format(
      new CompleteResponse({
        content: "  Hello world  ",
        reasoning: "step-by-step",
        image_urls: ["a", "b"],
        audio_urls: ["c"],
        video_urls: [],
      }),
    );

    expect(formatted).toEqual({
      text: "Hello world",
      metadata: {
        hasReasoning: true,
        imageCount: 2,
        audioCount: 1,
        videoCount: 0,
      },
    });
  });

  it("returns null text for empty response content", () => {
    const formatter = new ExternalChannelReplyContentFormatter();
    const formatted = formatter.format(new CompleteResponse({ content: "   " }));
    expect(formatted.text).toBeNull();
  });
});
