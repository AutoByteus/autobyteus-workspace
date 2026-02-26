import { describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { ChannelMessageReceiptService } from "../../../../src/external-channel/services/channel-message-receipt-service.js";
import type {
  ChannelIngressReceiptInput,
  ChannelSourceContext,
} from "../../../../src/external-channel/domain/models.js";
import type { ChannelMessageReceiptProvider } from "../../../../src/external-channel/providers/channel-message-receipt-provider.js";

const createReceiptInput = (): ChannelIngressReceiptInput => ({
  provider: ExternalChannelProvider.WHATSAPP,
  transport: ExternalChannelTransport.BUSINESS_API,
  accountId: " account-1 ",
  peerId: " peer-1 ",
  threadId: " thread-1 ",
  externalMessageId: " msg-1 ",
  receivedAt: new Date("2026-02-08T00:00:00.000Z"),
  agentRunId: " agent-1 ",
  teamRunId: null,
});

const createSourceContext = (): ChannelSourceContext => ({
  provider: ExternalChannelProvider.WHATSAPP,
  transport: ExternalChannelTransport.BUSINESS_API,
  accountId: "account-1",
  peerId: "peer-1",
  threadId: "thread-1",
  externalMessageId: "msg-1",
  receivedAt: new Date("2026-02-08T00:00:00.000Z"),
});

describe("ChannelMessageReceiptService", () => {
  it("normalizes values and delegates receipt writes", async () => {
    const provider: ChannelMessageReceiptProvider = {
      recordIngressReceipt: vi.fn().mockResolvedValue(undefined),
      bindTurnToReceipt: vi.fn().mockResolvedValue(undefined),
      getLatestSourceByAgentRunId: vi.fn(),
      getLatestSourceByDispatchTarget: vi.fn(),
      getSourceByAgentRunTurn: vi.fn(),
    };
    const service = new ChannelMessageReceiptService(provider);

    await service.recordIngressReceipt(createReceiptInput());

    expect(provider.recordIngressReceipt).toHaveBeenCalledWith({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId: "account-1",
      peerId: "peer-1",
      threadId: "thread-1",
      externalMessageId: "msg-1",
      receivedAt: new Date("2026-02-08T00:00:00.000Z"),
      agentRunId: "agent-1",
      teamRunId: null,
    });
  });

  it("throws when both agentRunId and teamRunId are absent", async () => {
    const provider: ChannelMessageReceiptProvider = {
      recordIngressReceipt: vi.fn(),
      bindTurnToReceipt: vi.fn(),
      getLatestSourceByAgentRunId: vi.fn(),
      getLatestSourceByDispatchTarget: vi.fn(),
      getSourceByAgentRunTurn: vi.fn(),
    };
    const service = new ChannelMessageReceiptService(provider);
    const input = createReceiptInput();
    input.agentRunId = null;

    await expect(service.recordIngressReceipt(input)).rejects.toThrow(
      "Ingress receipt requires at least one target reference (agentRunId or teamRunId).",
    );
    expect(provider.recordIngressReceipt).not.toHaveBeenCalled();
  });

  it("validates and delegates source lookups", async () => {
    const context = createSourceContext();
    const provider: ChannelMessageReceiptProvider = {
      recordIngressReceipt: vi.fn(),
      bindTurnToReceipt: vi.fn(),
      getLatestSourceByAgentRunId: vi.fn().mockResolvedValue(context),
      getLatestSourceByDispatchTarget: vi.fn().mockResolvedValue(context),
      getSourceByAgentRunTurn: vi.fn().mockResolvedValue(context),
    };
    const service = new ChannelMessageReceiptService(provider);

    const result = await service.getLatestSourceByAgentRunId(" agent-1 ");

    expect(result).toEqual(context);
    expect(provider.getLatestSourceByAgentRunId).toHaveBeenCalledWith("agent-1");
  });

  it("throws on blank lookup agentRunId", async () => {
    const provider: ChannelMessageReceiptProvider = {
      recordIngressReceipt: vi.fn(),
      bindTurnToReceipt: vi.fn(),
      getLatestSourceByAgentRunId: vi.fn(),
      getLatestSourceByDispatchTarget: vi.fn(),
      getSourceByAgentRunTurn: vi.fn(),
    };
    const service = new ChannelMessageReceiptService(provider);

    await expect(service.getLatestSourceByAgentRunId("   ")).rejects.toThrow(
      "agentRunId must be a non-empty string.",
    );
    expect(provider.getLatestSourceByAgentRunId).not.toHaveBeenCalled();
  });

  it("normalizes and delegates dispatch-target source lookups", async () => {
    const context = createSourceContext();
    const provider: ChannelMessageReceiptProvider = {
      recordIngressReceipt: vi.fn(),
      bindTurnToReceipt: vi.fn(),
      getLatestSourceByAgentRunId: vi.fn(),
      getLatestSourceByDispatchTarget: vi.fn().mockResolvedValue(context),
      getSourceByAgentRunTurn: vi.fn().mockResolvedValue(context),
    };
    const service = new ChannelMessageReceiptService(provider);

    const result = await service.getLatestSourceByDispatchTarget({
      agentRunId: " agent-1 ",
      teamRunId: " ",
    });

    expect(result).toEqual(context);
    expect(provider.getLatestSourceByDispatchTarget).toHaveBeenCalledWith({
      agentRunId: "agent-1",
      teamRunId: null,
    });
  });

  it("rejects dispatch-target lookup with no identifiers", async () => {
    const provider: ChannelMessageReceiptProvider = {
      recordIngressReceipt: vi.fn(),
      bindTurnToReceipt: vi.fn(),
      getLatestSourceByAgentRunId: vi.fn(),
      getLatestSourceByDispatchTarget: vi.fn(),
      getSourceByAgentRunTurn: vi.fn(),
    };
    const service = new ChannelMessageReceiptService(provider);

    await expect(
      service.getLatestSourceByDispatchTarget({
        agentRunId: " ",
        teamRunId: null,
      }),
    ).rejects.toThrow(
      "Dispatch target lookup requires at least one of agentRunId or teamRunId.",
    );
    expect(provider.getLatestSourceByDispatchTarget).not.toHaveBeenCalled();
  });

  it("normalizes and delegates turn binding", async () => {
    const provider: ChannelMessageReceiptProvider = {
      recordIngressReceipt: vi.fn(),
      bindTurnToReceipt: vi.fn().mockResolvedValue(undefined),
      getLatestSourceByAgentRunId: vi.fn(),
      getLatestSourceByDispatchTarget: vi.fn(),
      getSourceByAgentRunTurn: vi.fn(),
    };
    const service = new ChannelMessageReceiptService(provider);

    await service.bindTurnToReceipt({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.PERSONAL_SESSION,
      accountId: " acct-1 ",
      peerId: " peer-1 ",
      threadId: " ",
      externalMessageId: " msg-1 ",
      turnId: " turn-1 ",
      agentRunId: " agent-1 ",
      teamRunId: null,
      receivedAt: new Date("2026-02-09T00:00:00.000Z"),
    });

    expect(provider.bindTurnToReceipt).toHaveBeenCalledWith({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.PERSONAL_SESSION,
      accountId: "acct-1",
      peerId: "peer-1",
      threadId: null,
      externalMessageId: "msg-1",
      turnId: "turn-1",
      agentRunId: "agent-1",
      teamRunId: null,
      receivedAt: new Date("2026-02-09T00:00:00.000Z"),
    });
  });

  it("delegates source lookup by agent turn", async () => {
    const context = createSourceContext();
    const provider: ChannelMessageReceiptProvider = {
      recordIngressReceipt: vi.fn(),
      bindTurnToReceipt: vi.fn(),
      getLatestSourceByAgentRunId: vi.fn(),
      getLatestSourceByDispatchTarget: vi.fn(),
      getSourceByAgentRunTurn: vi.fn().mockResolvedValue(context),
    };
    const service = new ChannelMessageReceiptService(provider);

    const result = await service.getSourceByAgentRunTurn(" agent-1 ", " turn-1 ");

    expect(result).toEqual(context);
    expect(provider.getSourceByAgentRunTurn).toHaveBeenCalledWith("agent-1", "turn-1");
  });
});
