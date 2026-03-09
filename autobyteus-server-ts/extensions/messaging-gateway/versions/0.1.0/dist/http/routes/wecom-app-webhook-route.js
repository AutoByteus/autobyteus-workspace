import { ExternalChannelParseError } from "autobyteus-ts/external-channel/errors.js";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { toInboundHttpRequest } from "../mappers/http-request-mapper.js";
export function registerWeComAppWebhookRoutes(app, deps) {
    app.get("/webhooks/wecom-app/:accountId", async (request, reply) => {
        const accountId = normalizePathParam(request.params.accountId);
        if (!deps.accountRegistry.isConfiguredAccount(accountId)) {
            return reply.code(404).send({
                code: "ACCOUNT_NOT_CONFIGURED",
                detail: `WeCom app account '${accountId}' is not configured.`,
            });
        }
        const query = request.query ?? {};
        const timestamp = normalizeRequiredString(query.timestamp, "timestamp");
        const nonce = normalizeRequiredString(query.nonce, "nonce");
        const signature = normalizeRequiredString(query.signature, "signature");
        const echo = normalizeRequiredString(query.echostr, "echostr");
        const handshake = deps.wecomAdapter.verifyHandshake({
            accountId,
            timestamp,
            nonce,
            signature,
            echo,
        });
        if (!handshake.valid) {
            return reply.code(401).send({
                code: handshake.code ?? "INVALID_SIGNATURE",
                detail: handshake.detail,
            });
        }
        return reply.type("text/plain").code(200).send(echo);
    });
    app.post("/webhooks/wecom-app/:accountId", async (request, reply) => {
        try {
            const accountId = normalizePathParam(request.params.accountId);
            if (!deps.accountRegistry.isConfiguredAccount(accountId)) {
                return reply.code(404).send({
                    code: "ACCOUNT_NOT_CONFIGURED",
                    detail: `WeCom app account '${accountId}' is not configured.`,
                });
            }
            const mappedRequest = toInboundHttpRequest(request);
            const signature = deps.wecomAdapter.verifyInboundSignature(mappedRequest, mappedRequest.rawBody);
            if (!signature.valid) {
                return reply.code(401).send({
                    code: signature.code ?? "INVALID_SIGNATURE",
                    detail: signature.detail,
                });
            }
            const result = await deps.inboundMessageService.handleInbound(ExternalChannelProvider.WECOM, mappedRequest);
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
            if (error instanceof Error) {
                return reply.code(400).send({
                    code: "INVALID_REQUEST",
                    detail: error.message,
                });
            }
            return reply.code(500).send({
                code: "WECOM_APP_WEBHOOK_INTERNAL_ERROR",
                detail: "Unexpected WeCom app webhook error.",
            });
        }
    });
}
const normalizePathParam = (value) => normalizeRequiredString(value, "accountId");
const normalizeRequiredString = (value, field) => {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`${field} must be a non-empty string.`);
    }
    return value.trim();
};
//# sourceMappingURL=wecom-app-webhook-route.js.map