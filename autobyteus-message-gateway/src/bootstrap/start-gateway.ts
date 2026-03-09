import { readEnv } from "../config/env.js";
import { buildRuntimeConfig } from "../config/runtime-config.js";
import { createGatewayApp } from "./create-gateway-app.js";

export async function startGateway(): Promise<void> {
  const app = createGatewayApp(buildRuntimeConfig(readEnv()));
  const port = Number(process.env.GATEWAY_PORT ?? 8010);
  const host = process.env.GATEWAY_HOST ?? "0.0.0.0";
  let shuttingDown = false;

  const shutdown = async (): Promise<void> => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    removeSignalHandlers();
    await app.close();
  };

  const handleSigterm = async (): Promise<void> => {
    await shutdown();
  };

  const handleSigint = async (): Promise<void> => {
    await shutdown();
  };

  const removeSignalHandlers = (): void => {
    process.removeListener("SIGTERM", handleSigterm);
    process.removeListener("SIGINT", handleSigint);
  };

  process.once("SIGTERM", handleSigterm);
  process.once("SIGINT", handleSigint);

  try {
    await app.listen({ port, host });
  } catch (error) {
    removeSignalHandlers();
    throw error;
  }
}
