import { verifyWechatSidecarSignature } from "../middleware/verify-wechat-sidecar-signature.js";
export function registerWechatSidecarEventRoutes(app, deps) {
    app.post("/api/wechat-sidecar/v1/events", async (request, reply) => {
        try {
            const rawBody = request.rawBody ??
                JSON.stringify(request.body ?? {});
            const authResult = verifyWechatSidecarSignature({
                rawBody,
                signatureHeader: normalizeHeader(request.headers["x-autobyteus-sidecar-signature"]),
                timestampHeader: normalizeHeader(request.headers["x-autobyteus-sidecar-timestamp"]),
                secret: deps.sidecarSharedSecret,
            });
            if (!authResult.valid) {
                return reply.code(401).send({
                    code: authResult.errorCode ?? "INVALID_SIDECAR_SIGNATURE",
                    detail: authResult.message,
                });
            }
            await deps.wechatPersonalAdapter.ingestInboundEvent(request.body);
            return reply.code(202).send({
                accepted: true,
            });
        }
        catch (error) {
            if (error instanceof Error) {
                return reply.code(400).send({
                    code: "INVALID_SIDECAR_EVENT",
                    detail: error.message,
                });
            }
            return reply.code(500).send({
                code: "WECHAT_SIDECAR_EVENT_INTERNAL_ERROR",
                detail: "Unexpected WeChat sidecar event error.",
            });
        }
    });
}
const normalizeHeader = (value) => {
    if (typeof value === "string") {
        const normalized = value.trim();
        return normalized.length > 0 ? normalized : null;
    }
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") {
        const normalized = value[0].trim();
        return normalized.length > 0 ? normalized : null;
    }
    return null;
};
//# sourceMappingURL=wechat-sidecar-event-route.js.map