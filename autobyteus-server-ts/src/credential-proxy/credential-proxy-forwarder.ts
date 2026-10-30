import { Readable } from "node:stream";
import type { IncomingHttpHeaders } from "node:http";
import type { SecretValue } from "autobyteus-ts/secrets/secret-value.js";
import type { IntegrationRoute } from "./integration-definitions.js";

/** Why the proxy answers instead of GitHub: refusals (`403`) and an unreachable upstream (`502`). */
export type CredentialProxyErrorCode =
  | "NOT_LOOPBACK"
  | "RUN_PASS_INVALID"
  | "INTEGRATION_NOT_ALLOWED"
  | "INTEGRATION_NOT_CONNECTED"
  | "PATH_NOT_ALLOWED"
  | "UPSTREAM_REJECTED_TOKEN"
  | "UPSTREAM_UNREACHABLE";

export class CredentialProxyError extends Error {
  constructor(readonly code: CredentialProxyErrorCode, message: string, readonly status: number = 403) {
    super(message);
    this.name = "CredentialProxyError";
  }
}

export type ForwardRequest = Readonly<{
  method: string;
  /** The caller's path after `/r/:pass/:integrationId/:route`, as received (still percent-encoded), with its query. */
  rawPathAndQuery: string;
  headers: IncomingHttpHeaders;
  body: Readable | null;
}>;

export type ForwardResponse = Readonly<{
  status: number;
  headers: Record<string, string>;
  body: Buffer | Readable | null;
}>;

/** Request headers never forwarded: the caller's credentials, our own host, proxy and hop-by-hop headers. */
const DROPPED_REQUEST_HEADERS = new Set([
  "authorization", "cookie", "host", "connection", "keep-alive", "transfer-encoding", "te", "trailer", "upgrade",
  "expect", "accept-encoding", "content-length",
]);
const DROPPED_RESPONSE_HEADERS = new Set([
  "connection", "keep-alive", "transfer-encoding", "te", "trailer", "upgrade", "content-length", "content-encoding",
  "set-cookie",
]);
const TEXT_CONTENT = /^(text\/|application\/(?:[\w.+-]*\+)?json\b)/i;
const REDACTED = "[REDACTED]";

const readAll = async (stream: Readable): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
};

const pathRefusal = (): CredentialProxyError =>
  new CredentialProxyError("PATH_NOT_ALLOWED", "This path is not allowed for this integration.");

/**
 * The caller's path checked and parsed (AR-003): no `\`, no `.`/`..` segment (also encoded), no empty segment
 * (`//`), no encoded `/`. Returns the path and the query string.
 */
export const parseCallerPath = (rawPathAndQuery: string): Readonly<{ path: string; search: string }> => {
  const queryAt = rawPathAndQuery.indexOf("?");
  const path = queryAt < 0 ? rawPathAndQuery : rawPathAndQuery.slice(0, queryAt);
  const search = queryAt < 0 ? "" : rawPathAndQuery.slice(queryAt);
  if (!path.startsWith("/") || path.includes("\\") || /%5c|%2f/i.test(path)) throw pathRefusal();
  const segments = path.slice(1).split("/");
  for (const [index, segment] of segments.entries()) {
    const isTrailingSlash = index === segments.length - 1 && segment === "" && segments.length > 1;
    if (segment === "" && !isTrailingSlash && path !== "/") throw pathRefusal();
    let decoded: string;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      throw pathRefusal();
    }
    if (decoded === "." || decoded === "..") throw pathRefusal();
  }
  return { path, search };
};

/** The upstream URL for a caller's path on a route; refused unless it stays on the route's origin and paths. */
export const buildUpstreamUrl = (route: IntegrationRoute, method: string, rawPathAndQuery: string): URL => {
  const { path, search } = parseCallerPath(rawPathAndQuery);
  const upstream = new URL(route.basePath + path + search, route.origin);
  if (upstream.origin !== new URL(route.origin).origin) throw pathRefusal();
  if (!route.allows(method, upstream.pathname)) throw pathRefusal();
  return upstream;
};

const authorizationFor = (route: IntegrationRoute, token: string): string =>
  route.auth === "bearer"
    ? `Bearer ${token}`
    : `Basic ${Buffer.from(`x-access-token:${token}`, "utf8").toString("base64")}`;

/**
 * Forwards one checked call (DS-005). The token is revealed only while the upstream `Authorization` is built; it never
 * enters a log, an error or the activity record. The proxy never follows a redirect: a `Location` on the route's own
 * origin is rewritten through the proxy for the same route and pass, any other `Location` is passed unchanged.
 */
export class CredentialProxyForwarder {
  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async forward(input: Readonly<{
    route: IntegrationRoute;
    request: ForwardRequest;
    token: SecretValue;
    /** This route's address for the caller's pass, for rewriting a same-origin `Location`. */
    proxyRouteBase: string;
  }>): Promise<ForwardResponse> {
    const { route, request } = input;
    const upstream = buildUpstreamUrl(route, request.method, request.rawPathAndQuery);
    const headers = new Headers();
    for (const [name, value] of Object.entries(request.headers)) {
      const lower = name.toLowerCase();
      if (value === undefined || DROPPED_REQUEST_HEADERS.has(lower) || lower.startsWith("proxy-")) continue;
      headers.set(lower, Array.isArray(value) ? value.join(", ") : value);
    }
    const token = input.token.revealToTrustedConsumer();
    headers.set("authorization", authorizationFor(route, token));
    // Identity responses only: the body passes through (or is redacted) exactly as the upstream sent it.
    headers.set("accept-encoding", "identity");
    const hasBody = request.body !== null && !["GET", "HEAD"].includes(request.method);

    let response: Response;
    try {
      const body = !hasBody ? {}
        : route.buffersRequestBody ? { body: await readAll(request.body!) }
          : { body: Readable.toWeb(request.body!) as ReadableStream, duplex: "half" };
      response = await this.fetchImpl(upstream, { method: request.method, headers, redirect: "manual", ...body } as RequestInit);
    } catch {
      throw new CredentialProxyError("UPSTREAM_UNREACHABLE", "The integration's server could not be reached.", 502);
    }

    if (response.status === 401 && route.mapsUnauthorizedToForbidden) {
      await response.body?.cancel().catch(() => undefined);
      throw new CredentialProxyError("UPSTREAM_REJECTED_TOKEN",
        "GitHub rejected the stored token. Check it on the GitHub card in Settings.");
    }

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, name) => {
      if (DROPPED_RESPONSE_HEADERS.has(name)) return;
      responseHeaders[name] = value.split(token).join(REDACTED);
    });
    const location = response.headers.get("location");
    if (location) responseHeaders.location = this.rewriteLocation(route, upstream, location, input.proxyRouteBase);

    if (!response.body || request.method === "HEAD") {
      return { status: response.status, headers: responseHeaders, body: null };
    }
    if (route.redactsTextBodies && TEXT_CONTENT.test(response.headers.get("content-type") ?? "")) {
      const text = Buffer.from(await response.arrayBuffer()).toString("utf8");
      return { status: response.status, headers: responseHeaders, body: Buffer.from(text.split(token).join(REDACTED), "utf8") };
    }
    return {
      status: response.status,
      headers: responseHeaders,
      body: Readable.fromWeb(response.body as unknown as import("node:stream/web").ReadableStream),
    };
  }

  private rewriteLocation(route: IntegrationRoute, upstream: URL, location: string, proxyRouteBase: string): string {
    let target: URL;
    try {
      target = new URL(location, upstream);
    } catch {
      return location;
    }
    if (target.origin !== new URL(route.origin).origin) return location;
    const path = route.basePath && target.pathname.startsWith(route.basePath)
      ? target.pathname.slice(route.basePath.length)
      : target.pathname;
    return `${proxyRouteBase}${path}${target.search}`;
  }
}
