import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";
import type { InboundHttpRequest } from "../../../domain/models/inbound-http-request.js";
import type {
  ProviderAdapter,
  ProviderSendResult,
  SignatureResult,
} from "../../../domain/models/provider-adapter.js";
import type { WeComAccountRegistry } from "./wecom-account-registry.js";
import { WeComAdapter } from "./wecom-adapter.js";
import { WeComAppInboundStrategy } from "./wecom-app-inbound-strategy.js";
import { WeComAppOutboundStrategy } from "./wecom-app-outbound-strategy.js";

export type WeComUnifiedAdapterConfig = {
  legacyAdapter: WeComAdapter;
  accountRegistry: WeComAccountRegistry;
  appInboundStrategy: WeComAppInboundStrategy;
  appOutboundStrategy: WeComAppOutboundStrategy;
};

export class WeComUnifiedAdapter implements ProviderAdapter {
  readonly provider = ExternalChannelProvider.WECOM;
  readonly transport = ExternalChannelTransport.BUSINESS_API;

  constructor(private readonly config: WeComUnifiedAdapterConfig) {}

  verifyInboundSignature(
    request: InboundHttpRequest,
    rawBody: string,
  ): SignatureResult {
    if (isWeComAppPath(request.path)) {
      return this.config.appInboundStrategy.verifyCallback(request, rawBody);
    }
    return this.config.legacyAdapter.verifyInboundSignature(request, rawBody);
  }

  parseInbound(request: InboundHttpRequest): ExternalMessageEnvelope[] {
    if (isWeComAppPath(request.path)) {
      const accountId = extractAccountIdFromWeComAppPath(request.path);
      return this.config.appInboundStrategy.parseCallback(accountId, request);
    }
    return this.config.legacyAdapter.parseInbound(request);
  }

  async sendOutbound(payload: ExternalOutboundEnvelope): Promise<ProviderSendResult> {
    const account = this.config.accountRegistry.resolveAccount(payload.accountId);
    if (account?.mode === "APP") {
      return this.config.appOutboundStrategy.send(payload);
    }
    return this.config.legacyAdapter.sendOutbound(payload);
  }

  verifyHandshake(input: {
    accountId: string;
    timestamp: string;
    nonce: string;
    signature: string;
    echo: string;
  }): SignatureResult {
    const account = this.config.accountRegistry.resolveAccount(input.accountId);
    if (!account) {
      return {
        valid: false,
        code: "ACCOUNT_NOT_CONFIGURED",
        detail: `WeCom app account '${input.accountId}' is not configured.`,
      };
    }
    return this.config.appInboundStrategy.verifyHandshake({
      timestamp: input.timestamp,
      nonce: input.nonce,
      signature: input.signature,
      echo: input.echo,
    });
  }
}

const isWeComAppPath = (path: string): boolean =>
  path.includes("/webhooks/wecom-app/");

const extractAccountIdFromWeComAppPath = (path: string): string => {
  const match = path.match(/\/webhooks\/wecom-app\/([^/?#]+)/);
  if (!match || !match[1]) {
    throw new Error("accountId is required in /webhooks/wecom-app/:accountId path.");
  }
  return decodeURIComponent(match[1]);
};
