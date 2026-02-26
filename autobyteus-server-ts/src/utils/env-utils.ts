import { getLocalIp } from "./network-utils.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export function ensureServerHostEnvVar(host = "localhost", port = 8000): void {
  if (process.env.AUTOBYTEUS_SERVER_HOST) {
    return;
  }

  let hostForUrl = host;
  if (hostForUrl === "0.0.0.0" || hostForUrl === "::") {
    const detectedIp = getLocalIp();
    hostForUrl = detectedIp ?? "localhost";
  } else if (hostForUrl === "127.0.0.1" || hostForUrl === "localhost") {
    hostForUrl = "localhost";
  }

  const defaultBaseUrl = `http://${hostForUrl}:${port}`;
  logger.warn(
    `AUTOBYTEUS_SERVER_HOST not set; defaulting to ${defaultBaseUrl}. ` +
      "Set AUTOBYTEUS_SERVER_HOST explicitly for production use.",
  );
  process.env.AUTOBYTEUS_SERVER_HOST = defaultBaseUrl;
}
