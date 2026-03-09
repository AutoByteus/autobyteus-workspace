import { createHmac } from "node:crypto";
export function createWechatSidecarSignature(body, timestamp, secret) {
    return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}
//# sourceMappingURL=wechat-sidecar-signature.js.map