import { isLoopbackClientAddress } from "./remote-access-local-trust.js";

/** The packaged desktop app's renderer sends exactly this Origin on its WebSockets. */
const DESKTOP_APP_FILE_ORIGIN = "file://";

export type RequestOriginHeaders = {
  readonly [name: string]: string | string[] | undefined;
};

/** The node's allowed-origin rule: which browser Origins may reach the node. */
export type RequestOriginPolicy = {
  isAllowed(headers: RequestOriginHeaders): boolean;
};

export type ConfiguredOrigins = {
  origins: string[];
  invalidEntries: string[];
};

const firstHeaderValue = (value: string | string[] | undefined): string | null => {
  const single = Array.isArray(value) ? value[0] : value;
  const first = single?.split(",", 1)[0]?.trim().toLowerCase();
  return first || null;
};

const parseWebOrigin = (value: string): URL | null => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed : null;
  } catch {
    return null;
  }
};

const isLoopbackHostname = (hostname: string): boolean =>
  hostname === "localhost" || isLoopbackClientAddress(hostname);

/** Parses the comma-separated `AUTOBYTEUS_ALLOWED_ORIGINS` value into exact web origins. */
export const parseConfiguredOrigins = (raw: string): ConfiguredOrigins => {
  const origins: string[] = [];
  const invalidEntries: string[] = [];
  for (const entry of raw.split(",").map((value) => value.trim()).filter(Boolean)) {
    const parsed = parseWebOrigin(entry);
    if (parsed) {
      origins.push(parsed.origin);
    } else {
      invalidEntries.push(entry);
    }
  }
  return { origins, invalidEntries };
};

export const createRequestOriginPolicy = (configuredOrigins: readonly string[]): RequestOriginPolicy => {
  const configured = new Set(configuredOrigins);
  return {
    isAllowed(headers) {
      const origin = headers.origin;
      if (origin === undefined) {
        return true;
      }
      if (typeof origin !== "string") {
        return false;
      }
      if (origin === DESKTOP_APP_FILE_ORIGIN) {
        return true;
      }
      const parsed = parseWebOrigin(origin);
      if (!parsed) {
        return false;
      }
      // Same origin compares host[:port] only: TLS may end at a proxy such as Tailscale Serve.
      const originHost = parsed.host.toLowerCase();
      if (originHost === firstHeaderValue(headers.host) || originHost === firstHeaderValue(headers["x-forwarded-host"])) {
        return true;
      }
      return isLoopbackHostname(parsed.hostname.toLowerCase()) || configured.has(parsed.origin);
    },
  };
};
