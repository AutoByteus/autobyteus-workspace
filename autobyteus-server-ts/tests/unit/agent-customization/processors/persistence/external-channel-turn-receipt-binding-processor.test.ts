import { describe, expect, it } from "vitest";
import { ExternalChannelTurnReceiptBindingProcessor } from "../../../../../src/agent-customization/processors/persistence/external-channel-turn-receipt-binding-processor.js";

describe("ExternalChannelTurnReceiptBindingProcessor", () => {
  it("exposes processor metadata", () => {
    expect(ExternalChannelTurnReceiptBindingProcessor.getName()).toBe(
      "ExternalChannelTurnReceiptBindingProcessor",
    );
    expect(ExternalChannelTurnReceiptBindingProcessor.getOrder()).toBe(925);
  });

  it("is mandatory for all agents", () => {
    expect(ExternalChannelTurnReceiptBindingProcessor.isMandatory()).toBe(true);
  });
});
