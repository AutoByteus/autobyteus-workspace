import type { FastifyRequest } from "fastify";
import {
  REMOTE_ACCESS_AUTH_CONTEXT_PROPERTY,
  WEBSOCKET_ACCESS_TOKEN_QUERY_KEY,
  type RemoteAccessAuthContext,
  type RemoteAccessAuthorizationResult,
  type RemoteAccessRouteClassification,
} from "../../remote-access/domain/models.js";
import {
  getRemoteAccessAuthService,
  isMobileRemoteAccessCredential,
  readBearerCredential,
  type RemoteAccessAuthService,
} from "../../remote-access/services/remote-access-auth-service.js";
import { isLoopbackPeerAddress } from "./remote-access-local-trust.js";

const normalizeMethod = (method: string): string => String(method || "GET").toUpperCase();

const pathnameFromUrl = (url: string): string => {
  try {
    return new URL(url, "http://autobyteus.local").pathname.replace(/\/+$/, "") || "/";
  } catch {
    return String(url || "/").split("?", 1)[0]?.replace(/\/+$/, "") || "/";
  }
};

const isGraphqlWebSocketUpgrade = (method: string, path: string, headers?: Record<string, unknown>): boolean =>
  normalizeMethod(method) === "GET"
  && path === "/graphql"
  && String(headers?.["upgrade"] ?? "").toLowerCase() === "websocket";

const isApplicationBackendPath = (path: string): boolean =>
  /^\/rest\/applications\/[^/]+\/backend(?:\/|$)/.test(path);

const isApplicationBundleAssetPath = (path: string): boolean =>
  /^\/rest\/application-bundles\/[^/]+\/assets(?:\/|$)/.test(path);

const isProtectedRestFamily = (path: string): boolean =>
  path.startsWith("/rest/files/")
  || path.startsWith("/rest/media")
  || path === "/rest/upload-file"
  || path.startsWith("/rest/workspaces/")
  || path.startsWith("/rest/context-files/")
  || path.startsWith("/rest/drafts/")
  || path.startsWith("/rest/runs/")
  || path.startsWith("/rest/team-runs/")
  || path.startsWith("/rest/run-file-changes/")
  || path.startsWith("/rest/team-communication/");

export const classifyHttpRoute = (
  method: string,
  url: string,
  headers?: Record<string, unknown>,
): RemoteAccessRouteClassification => {
  const normalizedMethod = normalizeMethod(method);
  const path = pathnameFromUrl(url);

  if (normalizedMethod === "OPTIONS") {
    return "PUBLIC_PREFLIGHT";
  }
  if (path === "/mobile" || path.startsWith("/mobile/")) {
    return "PUBLIC_STATIC";
  }
  if (path === "/rest/health") {
    return "PUBLIC_HEALTH";
  }
  if (path === "/rest/remote-access/status" && normalizedMethod === "GET") {
    return "PUBLIC_HEALTH_STATUS";
  }
  if (path === "/rest/remote-access/pairing-exchanges" && normalizedMethod === "POST") {
    return "PUBLIC_PAIRING_EXCHANGE";
  }
  if (
    path === "/rest/remote-access/address-candidates"
    || path === "/rest/remote-access/pairing-sessions"
    || path === "/rest/remote-access/devices"
    || path === "/rest/remote-access/devices/revoked"
    || /^\/rest\/remote-access\/devices\/[^/]+$/.test(path)
    || path === "/rest/remote-access/settings"
  ) {
    return "TRUSTED_NETWORK_OWNER";
  }
  if (path === "/graphql") {
    if (isGraphqlWebSocketUpgrade(normalizedMethod, path, headers)) {
      return "TRUSTED_NETWORK_WEBSOCKET";
    }
    return normalizedMethod === "POST" ? "TRUSTED_NETWORK_PROTECTED" : "LOCAL_DEV_ONLY";
  }
  if (path.startsWith("/ws/")) {
    return "TRUSTED_NETWORK_WEBSOCKET";
  }
  if (
    path === "/rest/api/channel-ingress/v1/messages"
    || path === "/rest/api/channel-ingress/v1/delivery-events"
  ) {
    return "EXTERNAL_SIGNATURE";
  }
  if (isApplicationBackendPath(path) || isApplicationBundleAssetPath(path) || isProtectedRestFamily(path)) {
    return "TRUSTED_NETWORK_PROTECTED";
  }
  return "TRUSTED_NETWORK_PROTECTED";
};

const allowedWithoutAuth = new Set<RemoteAccessRouteClassification>([
  "PUBLIC_STATIC",
  "PUBLIC_HEALTH",
  "PUBLIC_HEALTH_STATUS",
  "PUBLIC_PREFLIGHT",
  "PUBLIC_PAIRING_EXCHANGE",
  "EXTERNAL_SIGNATURE",
]);

const reject = (
  statusCode: number,
  code: RemoteAccessAuthorizationResult extends infer T
    ? T extends { ok: false; code: infer C } ? C : never
    : never,
  message: string,
): RemoteAccessAuthorizationResult => ({ ok: false, statusCode, code, message });

const trustedNetworkContext = (peerAddress?: string): RemoteAccessAuthContext => {
  const isLoopback = isLoopbackPeerAddress(peerAddress);
  return {
    mode: isLoopback ? "loopback" : "trusted_network",
    isAuthenticated: isLoopback,
  };
};

const readWebSocketQueryCredential = (request: FastifyRequest): string | null => {
  try {
    return new URL(request.url, "http://autobyteus.local")
      .searchParams
      .get(WEBSOCKET_ACCESS_TOKEN_QUERY_KEY)
      ?.trim() || null;
  } catch {
    return null;
  }
};

export class RemoteAccessRoutePolicy {
  constructor(
    private readonly authService: RemoteAccessAuthService = getRemoteAccessAuthService(),
  ) {}

  classifyRequest(request: FastifyRequest): RemoteAccessRouteClassification {
    return classifyHttpRoute(request.method, request.url, request.headers as Record<string, unknown>);
  }

  async authorizeHttpRequest(request: FastifyRequest): Promise<RemoteAccessAuthorizationResult> {
    const routeClass = this.classifyRequest(request);
    const peerAddress = request.raw.socket.remoteAddress;

    if (allowedWithoutAuth.has(routeClass)) {
      return { ok: true, context: trustedNetworkContext(peerAddress) };
    }
    if (routeClass === "LOCAL_DEV_ONLY") {
      return isLoopbackPeerAddress(peerAddress)
        ? { ok: true, context: { mode: "loopback", isAuthenticated: true } }
        : reject(404, "REMOTE_ACCESS_ROUTE_UNSUPPORTED", "This route is not available to remote clients.");
    }

    const bearerCredential = readBearerCredential(request.headers.authorization);
    if (routeClass === "TRUSTED_NETWORK_OWNER") {
      if (isMobileRemoteAccessCredential(bearerCredential)) {
        return reject(403, "REMOTE_ACCESS_AUTH_INVALID", "Mobile credentials do not authorize owner-management routes.");
      }
      return { ok: true, context: trustedNetworkContext(peerAddress) };
    }

    if (routeClass === "TRUSTED_NETWORK_WEBSOCKET") {
      const credential = readWebSocketQueryCredential(request);
      if (isMobileRemoteAccessCredential(credential)) {
        return this.authService.authorizeMobileCredential(credential);
      }
      return { ok: true, context: trustedNetworkContext(peerAddress) };
    }

    if (isMobileRemoteAccessCredential(bearerCredential)) {
      return this.authService.authorizeMobileCredential(bearerCredential);
    }
    return { ok: true, context: trustedNetworkContext(peerAddress) };
  }
}

let singleton: RemoteAccessRoutePolicy | null = null;

export const getRemoteAccessRoutePolicy = (): RemoteAccessRoutePolicy => {
  singleton ??= new RemoteAccessRoutePolicy();
  return singleton;
};

export const getRemoteAccessAuthContext = (request: FastifyRequest): RemoteAccessAuthContext | null =>
  (request as unknown as Record<string, RemoteAccessAuthContext | undefined>)[REMOTE_ACCESS_AUTH_CONTEXT_PROPERTY] ?? null;

export const setRemoteAccessAuthContext = (request: FastifyRequest, context: RemoteAccessAuthContext): void => {
  (request as unknown as Record<string, RemoteAccessAuthContext>)[REMOTE_ACCESS_AUTH_CONTEXT_PROPERTY] = context;
};

export const resetRemoteAccessRoutePolicyForTests = (): void => {
  singleton = null;
};
