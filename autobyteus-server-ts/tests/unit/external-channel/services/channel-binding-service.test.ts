import { describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { ChannelBindingService } from "../../../../src/external-channel/services/channel-binding-service.js";
import type { ChannelBinding } from "../../../../src/external-channel/domain/models.js";
import type { ChannelBindingProvider } from "../../../../src/external-channel/providers/channel-binding-provider.js";

const createBinding = (transport: ExternalChannelTransport): ChannelBinding => ({
  id: `binding-${transport}`,
  provider: ExternalChannelProvider.WHATSAPP,
  transport,
  accountId: "acct-1",
  peerId: "peer-1",
  threadId: null,
  targetType: "AGENT",
  agentRunId: "agent-1",
  teamRunId: null,
  targetMemberName: null,
  createdAt: new Date("2026-02-08T00:00:00.000Z"),
  updatedAt: new Date("2026-02-08T00:00:00.000Z"),
});

describe("ChannelBindingService", () => {
  it("resolves route bindings via provider", async () => {
    const binding = createBinding(ExternalChannelTransport.BUSINESS_API);
    const provider: ChannelBindingProvider = {
      findBinding: vi.fn().mockResolvedValue(binding),
      isRouteBoundToTarget: vi.fn(),
      listBindings: vi.fn(),
      upsertBinding: vi.fn(),
      deleteBinding: vi.fn(),
    };
    const service = new ChannelBindingService(provider);

    const result = await service.resolveBinding({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId: "acct-1",
      peerId: "peer-1",
      threadId: null,
    });

    expect(result?.id).toBe(binding.id);
    expect(provider.findBinding).toHaveBeenCalledTimes(1);
  });

  it("delegates upsert, list, and delete", async () => {
    const binding = createBinding(ExternalChannelTransport.BUSINESS_API);
    const provider: ChannelBindingProvider = {
      findBinding: vi.fn(),
      isRouteBoundToTarget: vi.fn(),
      listBindings: vi.fn().mockResolvedValue([binding]),
      upsertBinding: vi.fn().mockResolvedValue(binding),
      deleteBinding: vi.fn().mockResolvedValue(true),
    };
    const service = new ChannelBindingService(provider);

    const upserted = await service.upsertBinding({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId: "acct-1",
      peerId: "peer-1",
      threadId: null,
      targetType: "AGENT",
      agentRunId: "agent-1",
      teamRunId: null,
      targetMemberName: null,
    });
    const listed = await service.listBindings();
    const deleted = await service.deleteBinding(binding.id);

    expect(upserted.id).toBe(binding.id);
    expect(listed).toEqual([binding]);
    expect(deleted).toBe(true);
  });

  it("normalizes and delegates route-target checks", async () => {
    const provider: ChannelBindingProvider = {
      findBinding: vi.fn(),
      isRouteBoundToTarget: vi.fn().mockResolvedValue(true),
      listBindings: vi.fn(),
      upsertBinding: vi.fn(),
      deleteBinding: vi.fn(),
    };
    const service = new ChannelBindingService(provider);

    const result = await service.isRouteBoundToTarget(
      {
        provider: ExternalChannelProvider.WHATSAPP,
        transport: ExternalChannelTransport.PERSONAL_SESSION,
        accountId: " acct-1 ",
        peerId: " peer-1 ",
        threadId: " ",
      },
      {
        agentRunId: " agent-1 ",
        teamRunId: null,
      },
    );

    expect(result).toBe(true);
    expect(provider.isRouteBoundToTarget).toHaveBeenCalledWith(
      {
        provider: ExternalChannelProvider.WHATSAPP,
        transport: ExternalChannelTransport.PERSONAL_SESSION,
        accountId: "acct-1",
        peerId: "peer-1",
        threadId: null,
      },
      {
        agentRunId: "agent-1",
        teamRunId: null,
      },
    );
  });

  it("rejects checks without any target id", async () => {
    const provider: ChannelBindingProvider = {
      findBinding: vi.fn(),
      isRouteBoundToTarget: vi.fn(),
      listBindings: vi.fn(),
      upsertBinding: vi.fn(),
      deleteBinding: vi.fn(),
    };
    const service = new ChannelBindingService(provider);

    await expect(
      service.isRouteBoundToTarget(
        {
          provider: ExternalChannelProvider.WHATSAPP,
          transport: ExternalChannelTransport.BUSINESS_API,
          accountId: "acct-1",
          peerId: "peer-1",
          threadId: null,
        },
        {
          agentRunId: " ",
          teamRunId: null,
        },
      ),
    ).rejects.toThrow(
      "Route-target verification requires at least one of agentRunId or teamRunId.",
    );
  });
});
