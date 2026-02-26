import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import type {
  InboundMessageService,
  InboundNormalizedResult,
} from "./inbound-message-service.js";

export type InboundEnvelopeBridgeErrorReporter = (input: {
  envelope: ExternalMessageEnvelope;
  error: unknown;
}) => void;

export type InboundEnvelopeBridgeInfoReporter = (input: {
  envelope: ExternalMessageEnvelope;
  result: InboundNormalizedResult;
  reason: "DUPLICATE";
}) => void;

export class InboundEnvelopeBridgeService {
  private readonly inboundMessageService: Pick<
    InboundMessageService,
    "handleNormalizedEnvelope"
  >;
  private readonly errorReporter: InboundEnvelopeBridgeErrorReporter;
  private readonly infoReporter: InboundEnvelopeBridgeInfoReporter;

  constructor(
    inboundMessageService: Pick<InboundMessageService, "handleNormalizedEnvelope">,
    errorReporter: InboundEnvelopeBridgeErrorReporter = defaultInboundEnvelopeErrorReporter,
    infoReporter: InboundEnvelopeBridgeInfoReporter = defaultInboundEnvelopeInfoReporter,
  ) {
    this.inboundMessageService = inboundMessageService;
    this.errorReporter = errorReporter;
    this.infoReporter = infoReporter;
  }

  async handleEnvelope(envelope: ExternalMessageEnvelope): Promise<void> {
    try {
      const result = await this.inboundMessageService.handleNormalizedEnvelope(envelope);
      if (result.duplicate) {
        this.infoReporter({
          envelope,
          result,
          reason: "DUPLICATE",
        });
      }
    } catch (error) {
      this.errorReporter({
        envelope,
        error,
      });
    }
  }
}

const defaultInboundEnvelopeErrorReporter: InboundEnvelopeBridgeErrorReporter = ({
  envelope,
  error,
}) => {
  const accountId = envelope.accountId ?? "unknown";
  const externalMessageId = envelope.externalMessageId ?? "unknown";
  console.error(
    "[gateway] failed to forward inbound envelope",
    {
      provider: envelope.provider,
      transport: envelope.transport,
      accountId,
      externalMessageId,
      error,
    },
  );
};

const defaultInboundEnvelopeInfoReporter: InboundEnvelopeBridgeInfoReporter = ({
  envelope,
  result,
  reason,
}) => {
  const accountId = envelope.accountId ?? "unknown";
  const externalMessageId = envelope.externalMessageId ?? "unknown";
  console.info(
    "[gateway] inbound envelope deduplicated and skipped enqueue",
    {
      provider: envelope.provider,
      transport: envelope.transport,
      accountId,
      externalMessageId,
      reason,
      disposition: result.disposition,
    },
  );
};
