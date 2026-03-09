import { createHmac } from "node:crypto";
export function createServerSignature(body, timestamp, secret) {
    return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}
//# sourceMappingURL=server-signature.js.map