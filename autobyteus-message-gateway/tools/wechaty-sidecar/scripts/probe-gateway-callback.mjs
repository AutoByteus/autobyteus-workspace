import { createHmac } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envFile = path.resolve(__dirname, "../.env");
dotenv.config({ path: envFile, override: false });

const gatewayBaseUrl = (process.env.GATEWAY_BASE_URL ?? "").trim().replace(/\/+$/, "");
const sharedSecret = (process.env.SIDECAR_SHARED_SECRET ?? "").trim();

if (!gatewayBaseUrl) {
  console.error("[probe] GATEWAY_BASE_URL is required in .env");
  process.exit(1);
}
if (!sharedSecret) {
  console.error("[probe] SIDECAR_SHARED_SECRET is required in .env");
  process.exit(1);
}

const payload = {
  sessionId: "probe-session",
  accountLabel: "probe-account",
  peerId: "probe-peer",
  peerType: "USER",
  threadId: null,
  messageId: "probe-msg",
  content: "probe message",
  receivedAt: new Date().toISOString(),
  metadata: {
    source: "sidecar-probe",
  },
};

const body = JSON.stringify(payload);
const timestamp = Math.floor(Date.now() / 1000).toString();
const signature = createHmac("sha256", sharedSecret)
  .update(`${timestamp}.${body}`)
  .digest("hex");

const response = await fetch(`${gatewayBaseUrl}/api/wechat-sidecar/v1/events`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-autobyteus-sidecar-signature": signature,
    "x-autobyteus-sidecar-timestamp": timestamp,
  },
  body,
});

const text = await response.text();
console.log(`[probe] status=${response.status}`);
console.log(`[probe] body=${text}`);

if (response.status !== 202) {
  process.exit(1);
}
