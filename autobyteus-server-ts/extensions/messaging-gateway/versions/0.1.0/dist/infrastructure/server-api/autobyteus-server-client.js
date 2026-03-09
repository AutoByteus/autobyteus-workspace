import { createServerSignature } from "./server-signature.js";
export class AutobyteusServerClient {
    static inboundIngressPath = "/rest/api/channel-ingress/v1/messages";
    static deliveryIngressPath = "/rest/api/channel-ingress/v1/delivery-events";
    baseUrl;
    sharedSecret;
    fetchImpl;
    constructor(config) {
        this.baseUrl = config.baseUrl;
        this.sharedSecret = config.sharedSecret;
        this.fetchImpl = config.fetchImpl ?? fetch;
    }
    async forwardInbound(payload) {
        const response = await this.postJson(AutobyteusServerClient.inboundIngressPath, payload);
        const body = await response.json();
        const duplicate = Boolean(body.duplicate);
        const disposition = parseIngressDisposition(body.disposition);
        const bindingResolved = typeof body.bindingResolved === "boolean"
            ? body.bindingResolved
            : disposition === "ROUTED";
        return {
            accepted: Boolean(body.accepted),
            duplicate,
            disposition,
            bindingResolved,
        };
    }
    async postDeliveryEvent(payload) {
        const response = await this.postJson(AutobyteusServerClient.deliveryIngressPath, payload);
        if (!response.ok) {
            throw new Error(`Server delivery event rejected with status ${response.status}.`);
        }
    }
    async postJson(path, payload) {
        const body = JSON.stringify(payload);
        const headers = new Headers({
            "content-type": "application/json",
        });
        if (this.sharedSecret) {
            const timestamp = Math.floor(Date.now() / 1000).toString();
            headers.set("x-autobyteus-gateway-timestamp", timestamp);
            headers.set("x-autobyteus-gateway-signature", createServerSignature(body, timestamp, this.sharedSecret));
        }
        const response = await this.fetchImpl(new URL(path, this.baseUrl), {
            method: "POST",
            headers,
            body,
        });
        if (!response.ok) {
            throw new Error(`Server request failed for ${path} with status ${response.status}.`);
        }
        return response;
    }
}
const parseIngressDisposition = (value) => {
    if (value === "ROUTED" || value === "UNBOUND" || value === "DUPLICATE") {
        return value;
    }
    throw new Error(`Server ingress response contains unsupported disposition: ${String(value)}.`);
};
//# sourceMappingURL=autobyteus-server-client.js.map