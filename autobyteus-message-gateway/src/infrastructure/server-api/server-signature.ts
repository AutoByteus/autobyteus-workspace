import { createHmac } from "node:crypto";

export function createServerSignature(body: string, timestamp: string, secret: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}
