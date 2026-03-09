import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";

const resolveGatewayCallbackPublisherOptionsMock = vi.fn();
const gatewayCallbackPublisherConstructorMock = vi.fn();
const gatewayCallbackPublisherPublishMock = vi.fn().mockResolvedValue(undefined);
const getSourceByAgentRunTurnMock = vi.fn();
const reserveCallbackKeyMock = vi.fn();
const isRouteBoundToTargetMock = vi.fn();
const upsertByCallbackKeyMock = vi.fn();

vi.mock(
  "../../../../../src/external-channel/runtime/gateway-callback-publisher-options-resolver.js",
  () => ({
    resolveGatewayCallbackPublisherOptions:
      resolveGatewayCallbackPublisherOptionsMock,
  }),
);

vi.mock(
  "../../../../../src/external-channel/runtime/gateway-callback-publisher.js",
  () => ({
    GatewayCallbackPublisher: class {
      constructor(options: unknown) {
        gatewayCallbackPublisherConstructorMock(options);
      }

      publish(envelope: unknown): Promise<void> {
        return gatewayCallbackPublisherPublishMock(envelope);
      }
    },
  }),
);

vi.mock(
  "../../../../../src/external-channel/providers/provider-proxy-set.js",
  () => ({
    getProviderProxySet: () => ({
      messageReceiptProvider: {
        recordIngressReceipt: vi.fn(),
        bindTurnToReceipt: vi.fn(),
        getLatestSourceByAgentRunId: vi.fn(),
        getLatestSourceByDispatchTarget: vi.fn(),
        getSourceByAgentRunTurn: getSourceByAgentRunTurnMock,
      },
      callbackIdempotencyProvider: {
        reserveKey: reserveCallbackKeyMock,
      },
      bindingProvider: {
        findBinding: vi.fn(),
        findProviderDefaultBinding: vi.fn(),
        findBindingByDispatchTarget: vi.fn(),
        isRouteBoundToTarget: isRouteBoundToTargetMock,
        listBindings: vi.fn(),
        upsertBinding: vi.fn(),
        upsertBindingAgentRunId: vi.fn(),
        deleteBinding: vi.fn(),
      },
      deliveryEventProvider: {
        upsertByCallbackKey: upsertByCallbackKeyMock,
        findByCallbackKey: vi.fn(),
      },
    }),
  }),
);

describe("ExternalChannelAssistantReplyProcessor delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    resolveGatewayCallbackPublisherOptionsMock.mockReturnValue({
      baseUrl: "http://127.0.0.1:8010",
      sharedSecret: null,
      timeoutMs: 5_000,
    });
    getSourceByAgentRunTurnMock.mockResolvedValue({
      provider: ExternalChannelProvider.TELEGRAM,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId: "@autobyteus_bot",
      peerId: "8438880216",
      threadId: null,
      externalMessageId: "msg-1",
      receivedAt: new Date("2026-03-09T08:26:00.000Z"),
      turnId: "turn-1",
    });
    reserveCallbackKeyMock.mockResolvedValue({
      firstSeen: true,
      record: {
        key: "external-reply:agent-run-1:turn-1",
        firstSeenAt: new Date("2026-03-09T08:27:00.000Z"),
        expiresAt: null,
      },
    });
    isRouteBoundToTargetMock.mockResolvedValue(true);
    upsertByCallbackKeyMock.mockImplementation(async (input) => ({
      id: "delivery-1",
      ...input,
      createdAt: new Date("2026-03-09T08:27:00.000Z"),
      updatedAt: new Date("2026-03-09T08:27:00.000Z"),
    }));
  });

  it("publishes assistant replies through the managed callback fallback when no explicit callback override is configured", async () => {
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

    expect(resolveGatewayCallbackPublisherOptionsMock).toHaveBeenCalledOnce();
    expect(gatewayCallbackPublisherConstructorMock).toHaveBeenCalledWith({
      baseUrl: "http://127.0.0.1:8010",
      sharedSecret: null,
      timeoutMs: 5_000,
    });
    expect(gatewayCallbackPublisherPublishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: ExternalChannelProvider.TELEGRAM,
        transport: ExternalChannelTransport.BUSINESS_API,
        accountId: "@autobyteus_bot",
        peerId: "8438880216",
        replyText: "What I can do for you as a professor",
        callbackIdempotencyKey: "external-reply:agent-run-1:turn-1",
      }),
    );
  });
});
