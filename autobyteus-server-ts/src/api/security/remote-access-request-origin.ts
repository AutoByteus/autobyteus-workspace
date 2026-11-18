import { parseWebOrigin } from "./web-origin.js";

/** The packaged desktop app's renderer sends exactly this Origin on its WebSockets. */
const DESKTOP_APP_FILE_ORIGIN = "file://";

export type RequestOriginHeaders = {
  readonly [name: string]: string | string[] | undefined;
};

/** An allowed-origin rule: which browser Origins may reach one kind of listener. */
export type RequestOriginPolicy = {
  isAllowed(headers: RequestOriginHeaders): boolean;
};

const firstHeaderValue = (value: string | string[] | undefined): string | null => {
  const single = Array.isArray(value) ? value[0] : value;
  const first = single?.split(",", 1)[0]?.trim().toLowerCase();
  return first || null;
};

/**
 * The node's allowed-origin rule (main listener): no Origin, the desktop app's `file://`, the node's own
 * origin, or a configured origin. Runs after the Host gate, so `Host` is one of the node's names here.
 */
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
      return configured.has(parsed.origin);
    },
  };
};

/**
 * The tool-endpoint origin rule (`/mcp/gateway`, the agent-tools and credential-proxy listeners), whose
 * clients are programs: no Origin, or a configured origin.
 */
export const createToolEndpointOriginPolicy = (configuredOrigins: readonly string[]): RequestOriginPolicy => {
  const configured = new Set(configuredOrigins);
  return {
    isAllowed(headers) {
      const origin = headers.origin;
      if (origin === undefined) {
        return true;
      }
      const parsed = typeof origin === "string" ? parseWebOrigin(origin) : null;
      return parsed !== null && configured.has(parsed.origin);
    },
  };
};
