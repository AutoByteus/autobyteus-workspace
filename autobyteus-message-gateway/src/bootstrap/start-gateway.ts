import { readEnv } from "../config/env.js";
import { buildRuntimeConfig } from "../config/runtime-config.js";
import { createGatewayApp } from "./create-gateway-app.js";

export async function startGateway(): Promise<void> {
  const app = createGatewayApp(buildRuntimeConfig(readEnv()));
  const port = Number(process.env.GATEWAY_PORT ?? 8010);
  const host = process.env.GATEWAY_HOST ?? "0.0.0.0";
  await app.listen({ port, host });
}
