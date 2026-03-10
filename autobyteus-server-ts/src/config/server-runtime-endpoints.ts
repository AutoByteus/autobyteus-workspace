import { isIP, type AddressInfo } from "node:net";

export const AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR =
  "AUTOBYTEUS_INTERNAL_SERVER_BASE_URL";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const WILDCARD_HOSTS = new Set(["0.0.0.0", "::"]);

export class ServerRuntimeEndpointError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServerRuntimeEndpointError";
  }
}

export const buildInternalServerBaseUrl = (input: {
  host: string;
  port: number;
}): string => {
  const normalizedHost = normalizeInternalServerHost(input.host);
  const normalizedPort = normalizePort(input.port);
  const hostForUrl =
    isIP(normalizedHost) === 6 ? `[${normalizedHost}]` : normalizedHost;
  return `http://${hostForUrl}:${normalizedPort}`;
};

export const seedInternalServerBaseUrl = (input: {
  host: string;
  port: number;
}): string => {
  const baseUrl = buildInternalServerBaseUrl(input);
  process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR] = baseUrl;
  return baseUrl;
};

export const seedInternalServerBaseUrlFromListenAddress = (input: {
  requestedHost: string;
  listenAddress: AddressInfo | string | null;
}): string => {
  if (!input.listenAddress) {
    throw new ServerRuntimeEndpointError(
      "Cannot derive the internal server base URL because the server listen address is unavailable.",
    );
  }
  if (typeof input.listenAddress === "string") {
    throw new ServerRuntimeEndpointError(
      "Cannot derive the internal server base URL from a socket/pipe listen address. Managed messaging requires a TCP host/port binding.",
    );
  }

  return seedInternalServerBaseUrl({
    host: input.requestedHost,
    port: input.listenAddress.port,
  });
};

export const getInternalServerBaseUrlOrThrow = (): string => {
  const rawValue = process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR];
  if (!rawValue || rawValue.trim().length === 0) {
    throw new ServerRuntimeEndpointError(
      `Managed messaging requires ${AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR} to be seeded from the active server listen address before building gateway runtime env.`,
    );
  }

  return normalizeAbsoluteBaseUrl(rawValue);
};

const normalizeInternalServerHost = (host: string): string => {
  const trimmedHost = host.trim();
  if (trimmedHost.length === 0) {
    throw new ServerRuntimeEndpointError(
      "Cannot derive the internal server base URL because the listen host is empty.",
    );
  }

  const comparableHost = stripIpv6Brackets(trimmedHost).toLowerCase();
  if (LOOPBACK_HOSTS.has(comparableHost) || WILDCARD_HOSTS.has(comparableHost)) {
    return "127.0.0.1";
  }
  return stripIpv6Brackets(trimmedHost);
};

const normalizePort = (port: number): number => {
  if (!Number.isInteger(port) || port <= 0) {
    throw new ServerRuntimeEndpointError(
      `Cannot derive the internal server base URL because the listen port '${String(port)}' is invalid.`,
    );
  }
  return port;
};

const normalizeAbsoluteBaseUrl = (value: string): string => {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(value.trim());
  } catch (error) {
    throw new ServerRuntimeEndpointError(
      `Managed messaging internal server base URL is invalid: ${String(error)}`,
    );
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new ServerRuntimeEndpointError(
      `Managed messaging internal server base URL must use http or https, received '${parsedUrl.protocol}'.`,
    );
  }
  if (!parsedUrl.hostname || parsedUrl.port.length === 0) {
    throw new ServerRuntimeEndpointError(
      "Managed messaging internal server base URL must include both host and port.",
    );
  }
  if ((parsedUrl.pathname && parsedUrl.pathname !== "/") || parsedUrl.search || parsedUrl.hash) {
    throw new ServerRuntimeEndpointError(
      "Managed messaging internal server base URL must not include a path, query string, or hash.",
    );
  }

  return parsedUrl.toString().replace(/\/+$/, "");
};

const stripIpv6Brackets = (value: string): string => {
  if (value.startsWith("[") && value.endsWith("]")) {
    return value.slice(1, -1);
  }
  return value;
};
