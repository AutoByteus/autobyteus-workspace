import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { StandaloneApplicationHostConfig } from "./standalone-application-host-config.js";

export const materializeStandaloneHostConfig = async (
  config: StandaloneApplicationHostConfig,
): Promise<{ envPath: string; serverPublicUrl: string; databaseUrl: string }> => {
  await fs.mkdir(config.appDataDir, { recursive: true });
  const envPath = path.join(config.appDataDir, ".env");
  try {
    const handle = await fs.open(envPath, "wx", 0o600);
    await handle.close();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
      throw error;
    }
  }

  const serverPublicUrl = config.publicBaseUrl
    ?? `http://${config.host.includes(":") ? `[${config.host}]` : config.host}:${config.port}`;
  const databaseUrl = pathToFileURL(
    path.join(config.appDataDir, "db", "production.db"),
  ).href;
  process.env.AUTOBYTEUS_SERVER_HOST = serverPublicUrl;
  process.env.DATABASE_URL = databaseUrl;
  return { envPath, serverPublicUrl, databaseUrl };
};
