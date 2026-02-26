import { describe, expect, it } from "vitest";
import { ExternalChannelAssistantReplyProcessor } from "../../../../../src/agent-customization/processors/response-customization/external-channel-assistant-reply-processor.js";

describe("ExternalChannelAssistantReplyProcessor", () => {
  it("exposes processor metadata", () => {
    expect(ExternalChannelAssistantReplyProcessor.getName()).toBe(
      "ExternalChannelAssistantReplyProcessor",
    );
    expect(ExternalChannelAssistantReplyProcessor.getOrder()).toBe(980);
  });

  it("is mandatory for all agents", () => {
    expect(ExternalChannelAssistantReplyProcessor.isMandatory()).toBe(true);
  });
});
