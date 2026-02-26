import { describe, expect, it, vi } from "vitest";
import { InboundEnvelopeBridgeService } from "../../../../src/application/services/inbound-envelope-bridge-service.js";

describe("InboundEnvelopeBridgeService", () => {
  it("bridges session envelopes into inbound normalized handler", async () => {
    const handleNormalizedEnvelope = vi.fn(async () => ({
      duplicate: false,
      blocked: false,
      forwarded: false,
      disposition: "QUEUED",
      bindingResolved: false,
    }));

    const service = new InboundEnvelopeBridgeService({
      handleNormalizedEnvelope,
    } as any);

    await service.handleEnvelope({ externalMessageId: "msg-1" } as any);

    expect(handleNormalizedEnvelope).toHaveBeenCalledOnce();
  });

  it("reports duplicate envelopes as informational signal", async () => {
    const handleNormalizedEnvelope = vi.fn(async () => ({
      duplicate: true,
      blocked: false,
      forwarded: false,
      disposition: "DUPLICATE",
      bindingResolved: false,
    }));
    const infoReporter = vi.fn();

    const service = new InboundEnvelopeBridgeService(
      {
        handleNormalizedEnvelope,
      } as any,
      vi.fn(),
      infoReporter,
    );

    await service.handleEnvelope({
      provider: "WHATSAPP",
      transport: "PERSONAL_SESSION",
      accountId: "home",
      externalMessageId: "msg-duplicate",
    } as any);

    expect(infoReporter).toHaveBeenCalledOnce();
    expect(infoReporter).toHaveBeenCalledWith({
      envelope: expect.objectContaining({
        provider: "WHATSAPP",
        transport: "PERSONAL_SESSION",
        accountId: "home",
        externalMessageId: "msg-duplicate",
      }),
      reason: "DUPLICATE",
      result: expect.objectContaining({
        disposition: "DUPLICATE",
      }),
    });
  });

  it("swallows enqueue errors and reports them", async () => {
    const error = new Error("queue write failed");
    const handleNormalizedEnvelope = vi.fn(async () => {
      throw error;
    });
    const errorReporter = vi.fn();

    const service = new InboundEnvelopeBridgeService(
      {
        handleNormalizedEnvelope,
      } as any,
      errorReporter,
    );

    await expect(
      service.handleEnvelope({
        provider: "WHATSAPP",
        transport: "PERSONAL_SESSION",
        accountId: "home",
        externalMessageId: "msg-err",
      } as any),
    ).resolves.toBeUndefined();

    expect(handleNormalizedEnvelope).toHaveBeenCalledOnce();
    expect(errorReporter).toHaveBeenCalledOnce();
  });
});
