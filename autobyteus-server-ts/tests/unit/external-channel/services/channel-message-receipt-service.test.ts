import { describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { ChannelMessageReceiptService } from "../../../../src/external-channel/services/channel-message-receipt-service.js";
import type {
  ChannelClaimIngressDispatchInput,
  ChannelMessageReceipt,
  ChannelPendingIngressReceiptInput,
  ChannelSourceContext,
} from "../../../../src/external-channel/domain/models.js";
import type { ChannelMessageReceiptProvider } from "../../../../src/external-channel/providers/channel-message-receipt-provider.js";

const createPendingInput = (): ChannelPendingIngressReceiptInput => ({
  provider: ExternalChannelProvider.WHATSAPP,
  transport: ExternalChannelTransport.BUSINESS_API,
  accountId: " account-1 ",
  peerId: " peer-1 ",
  threadId: " thread-1 ",
  externalMessageId: " msg-1 ",
  receivedAt: new Date("2026-02-08T00:00:00.000Z"),
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

const createReceipt = (): ChannelMessageReceipt => ({
  ...createSourceContext(),
  ingressState: "ROUTED",
  workflowState: "PUBLISHED",
  dispatchAcceptedAt: new Date("2026-02-08T00:00:10.000Z"),
  agentRunId: "agent-1",
  teamRunId: null,
  replyTextFinal: "final reply",
  lastError: null,
  dispatchLeaseToken: null,
  dispatchLeaseExpiresAt: null,
  createdAt: new Date("2026-02-08T00:00:00.000Z"),
  updatedAt: new Date("2026-02-08T00:00:00.000Z"),
});

const createProvider = (): ChannelMessageReceiptProvider => ({
  getReceiptByExternalMessage: vi.fn(),
  createPendingIngressReceipt: vi.fn(),
  claimIngressDispatch: vi.fn(),
  recordAcceptedDispatch: vi.fn(),
  updateReceiptWorkflowProgress: vi.fn(),
  markReplyPublished: vi.fn(),
  markIngressUnbound: vi.fn(),
  listReceiptsByIngressState: vi.fn(),
  listReceiptsByWorkflowStates: vi.fn(),
  getSourceByAgentRunTurn: vi.fn(),
});

describe("ChannelMessageReceiptService", () => {
  it("normalizes pending ingress receipt creation", async () => {
    const provider = createProvider();
    provider.createPendingIngressReceipt = vi.fn().mockResolvedValue(createReceipt());
    const service = new ChannelMessageReceiptService(provider);

    await service.createPendingIngressReceipt(createPendingInput());

    expect(provider.createPendingIngressReceipt).toHaveBeenCalledWith({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId: "account-1",
      peerId: "peer-1",
      threadId: "thread-1",
      externalMessageId: "msg-1",
      receivedAt: new Date("2026-02-08T00:00:00.000Z"),
    });
  });

  it("normalizes claim-ingress-dispatch inputs", async () => {
    const provider = createProvider();
    provider.claimIngressDispatch = vi.fn().mockResolvedValue(
      createReceipt({
        ...createReceipt(),
        ingressState: "DISPATCHING",
        dispatchLeaseToken: "lease-1",
        dispatchLeaseExpiresAt: new Date("2026-02-08T00:00:30.000Z"),
      }),
    );
    const service = new ChannelMessageReceiptService(provider);
    const input: ChannelClaimIngressDispatchInput = {
      ...createPendingInput(),
      claimedAt: new Date("2026-02-08T00:00:01.000Z"),
      leaseDurationMs: 30000,
    };

    await service.claimIngressDispatch(input);

    expect(provider.claimIngressDispatch).toHaveBeenCalledWith({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId: "account-1",
      peerId: "peer-1",
      threadId: "thread-1",
      externalMessageId: "msg-1",
      receivedAt: new Date("2026-02-08T00:00:00.000Z"),
      claimedAt: new Date("2026-02-08T00:00:01.000Z"),
      leaseDurationMs: 30000,
    });
  });

  it("delegates source lookup by agent turn", async () => {
    const context = createSourceContext();
    const provider = createProvider();
    provider.getSourceByAgentRunTurn = vi.fn().mockResolvedValue(context);
    const service = new ChannelMessageReceiptService(provider);

    const result = await service.getSourceByAgentRunTurn(" agent-1 ", " turn-1 ");

    expect(result).toEqual(context);
    expect(provider.getSourceByAgentRunTurn).toHaveBeenCalledWith("agent-1", "turn-1");
  });

  it("normalizes receipt workflow progress updates", async () => {
    const provider = createProvider();
    provider.updateReceiptWorkflowProgress = vi
      .fn()
      .mockResolvedValue(createReceipt());
    const service = new ChannelMessageReceiptService(provider);

    await service.updateReceiptWorkflowProgress({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.PERSONAL_SESSION,
      accountId: " acct-1 ",
      peerId: " peer-1 ",
      threadId: " ",
      externalMessageId: " msg-1 ",
      receivedAt: new Date("2026-02-09T00:00:00.000Z"),
      workflowState: "REPLY_FINALIZED",
      turnId: " turn-1 ",
      agentRunId: " agent-1 ",
      teamRunId: null,
      replyTextFinal: " done ",
      lastError: " ",
    });

    expect(provider.updateReceiptWorkflowProgress).toHaveBeenCalledWith({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.PERSONAL_SESSION,
      accountId: "acct-1",
      peerId: "peer-1",
      threadId: null,
      externalMessageId: "msg-1",
      receivedAt: new Date("2026-02-09T00:00:00.000Z"),
      workflowState: "REPLY_FINALIZED",
      turnId: "turn-1",
      agentRunId: "agent-1",
      teamRunId: null,
      replyTextFinal: "done",
      lastError: null,
    });
  });

  it("normalizes accepted dispatch persistence with explicit dispatchAcceptedAt", async () => {
    const provider = createProvider();
    provider.recordAcceptedDispatch = vi.fn().mockResolvedValue(createReceipt());
    const service = new ChannelMessageReceiptService(provider);

    await service.recordAcceptedDispatch({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.PERSONAL_SESSION,
      accountId: " acct-1 ",
      peerId: " peer-1 ",
      threadId: " ",
      externalMessageId: " msg-1 ",
      receivedAt: new Date("2026-02-09T00:00:00.000Z"),
      dispatchLeaseToken: " lease-1 ",
      agentRunId: " agent-1 ",
      teamRunId: null,
      turnId: " turn-1 ",
      dispatchAcceptedAt: new Date("2026-02-09T00:00:02.000Z"),
    });

    expect(provider.recordAcceptedDispatch).toHaveBeenCalledWith({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.PERSONAL_SESSION,
      accountId: "acct-1",
      peerId: "peer-1",
      threadId: null,
      externalMessageId: "msg-1",
      receivedAt: new Date("2026-02-09T00:00:00.000Z"),
      dispatchLeaseToken: "lease-1",
      agentRunId: "agent-1",
      teamRunId: null,
      turnId: "turn-1",
      dispatchAcceptedAt: new Date("2026-02-09T00:00:02.000Z"),
    });
  });

  it("treats missing or expired dispatch leases as expired", () => {
    const service = new ChannelMessageReceiptService(createProvider());

    expect(
      service.isDispatchLeaseExpired({
        dispatchLeaseExpiresAt: null,
      }),
    ).toBe(true);
    expect(
      service.isDispatchLeaseExpired(
        {
          dispatchLeaseExpiresAt: new Date("2026-02-08T00:00:30.000Z"),
        },
        new Date("2026-02-08T00:00:31.000Z"),
      ),
    ).toBe(true);
    expect(
      service.isDispatchLeaseExpired(
        {
          dispatchLeaseExpiresAt: new Date("2026-02-08T00:00:30.000Z"),
        },
        new Date("2026-02-08T00:00:29.000Z"),
      ),
    ).toBe(false);
  });
});
