import { ExternalChannelParseError } from "autobyteus-ts/external-channel/errors.js";
import { parseExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { toInboundHttpRequest } from "../mappers/http-request-mapper.js";
export function registerProviderWebhookRoutes(app, deps) {
    app.post("/webhooks/:provider", async (request, reply) => {
        try {
            const provider = parseExternalChannelProvider(request.params.provider);
            const adapter = deps.adaptersByProvider.get(provider);
            if (!adapter) {
                return reply.code(404).send({
                    code: "PROVIDER_NOT_SUPPORTED",
                    detail: `Provider ${provider} is not configured.`,
                });
            }
            const mappedRequest = toInboundHttpRequest(request);
            const signature = adapter.verifyInboundSignature(mappedRequest, mappedRequest.rawBody);
            if (!signature.valid) {
                return reply.code(401).send({
                    code: signature.code ?? "INVALID_SIGNATURE",
                    detail: signature.detail,
                });
            }
            const result = await deps.inboundMessageService.handleInbound(provider, mappedRequest);
            return reply.code(200).send(result);
        }
        catch (error) {
            if (error instanceof ExternalChannelParseError) {
                return reply.code(400).send({
                    code: error.code,
                    field: error.field ?? null,
                    detail: error.message,
                });
            }
            return reply.code(500).send({
                code: "INBOUND_WEBHOOK_INTERNAL_ERROR",
                detail: "Unexpected provider webhook error.",
            });
        }
    });
}
//# sourceMappingURL=provider-webhook-route.js.map