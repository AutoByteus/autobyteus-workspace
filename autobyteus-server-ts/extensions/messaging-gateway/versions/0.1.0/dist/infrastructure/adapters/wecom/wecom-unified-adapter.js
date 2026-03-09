import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
export class WeComUnifiedAdapter {
    config;
    provider = ExternalChannelProvider.WECOM;
    transport = ExternalChannelTransport.BUSINESS_API;
    constructor(config) {
        this.config = config;
    }
    verifyInboundSignature(request, rawBody) {
        if (isWeComAppPath(request.path)) {
            return this.config.appInboundStrategy.verifyCallback(request, rawBody);
        }
        return this.config.legacyAdapter.verifyInboundSignature(request, rawBody);
    }
    parseInbound(request) {
        if (isWeComAppPath(request.path)) {
            const accountId = extractAccountIdFromWeComAppPath(request.path);
            return this.config.appInboundStrategy.parseCallback(accountId, request);
        }
        return this.config.legacyAdapter.parseInbound(request);
    }
    async sendOutbound(payload) {
        const account = this.config.accountRegistry.resolveAccount(payload.accountId);
        if (account?.mode === "APP") {
            return this.config.appOutboundStrategy.send(payload);
        }
        return this.config.legacyAdapter.sendOutbound(payload);
    }
    verifyHandshake(input) {
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
const isWeComAppPath = (path) => path.includes("/webhooks/wecom-app/");
const extractAccountIdFromWeComAppPath = (path) => {
    const match = path.match(/\/webhooks\/wecom-app\/([^/?#]+)/);
    if (!match || !match[1]) {
        throw new Error("accountId is required in /webhooks/wecom-app/:accountId path.");
    }
    return decodeURIComponent(match[1]);
};
//# sourceMappingURL=wecom-unified-adapter.js.map