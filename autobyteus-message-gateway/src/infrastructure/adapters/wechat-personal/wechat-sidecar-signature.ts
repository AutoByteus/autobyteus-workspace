import { createHmac } from "node:crypto";

export function createWechatSidecarSignature(
  body: string,
  timestamp: string,
  secret: string,
): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}
