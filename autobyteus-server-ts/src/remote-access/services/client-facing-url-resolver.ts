import { appConfigProvider } from "../../config/app-config-provider.js";
import { isLoopbackPeerAddress } from "../../api/security/remote-access-local-trust.js";
import type {
  ClientFacingUrlContext,
  ResolveRestResourceUrlInput,
} from "../domain/models.js";
import { normalizeNodeBaseUrl } from "./url-normalization.js";

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

const sanitizeRestPath = (value: string): string => {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "/rest";
  }
  try {
    const parsed = new URL(raw);
    return parsed.pathname.startsWith("/rest")
      ? `${parsed.pathname}${parsed.search}`
      : `/rest${parsed.pathname.startsWith("/") ? parsed.pathname : `/${parsed.pathname}`}${parsed.search}`;
  } catch {
    const withoutHash = raw.split("#", 1)[0] ?? raw;
    const withSlash = withoutHash.startsWith("/") ? withoutHash : `/${withoutHash}`;
    return withSlash.startsWith("/rest") ? withSlash : `/rest${withSlash}`;
  }
};

const isLoopbackBaseUrl = (baseUrl: string): boolean => {
  try {
    const parsed = new URL(baseUrl);
    return LOOPBACK_HOSTNAMES.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
};

export class DefaultClientFacingUrlResolver {
  resolveClientFacingBaseUrl(context: ClientFacingUrlContext): string | null {
    const mobileBase = context.authContext?.mode === "mobile"
      ? context.authContext.clientFacingBaseUrl
      : null;
    const preferred = mobileBase
      || context.pairedDeviceClientBaseUrl
      || context.configuredExternalBaseUrl
      || null;
    if (preferred) {
      return normalizeNodeBaseUrl(preferred);
    }

    const peerAddress = context.request?.raw?.socket?.remoteAddress;
    if (isLoopbackPeerAddress(peerAddress) || !peerAddress) {
      return normalizeNodeBaseUrl(context.localFallbackBaseUrl);
    }

    return isLoopbackBaseUrl(context.localFallbackBaseUrl)
      ? null
      : normalizeNodeBaseUrl(context.localFallbackBaseUrl);
  }

  resolveRestResourceUrl(input: ResolveRestResourceUrlInput): string {
    const relativePath = this.toRestRelativePath(input.restPath);
    if (input.prefer !== "absolute") {
      return relativePath;
    }

    const baseUrl = this.resolveClientFacingBaseUrl(input.context);
    if (!baseUrl) {
      return relativePath;
    }
    return new URL(relativePath, baseUrl).toString();
  }

  toRestRelativePath(pathOrUrl: string): string {
    return sanitizeRestPath(pathOrUrl);
  }
}

let singleton: DefaultClientFacingUrlResolver | null = null;

export const getClientFacingUrlResolver = (): DefaultClientFacingUrlResolver => {
  singleton ??= new DefaultClientFacingUrlResolver();
  return singleton;
};

export const buildDefaultClientFacingUrlContext = (
  context: Omit<ClientFacingUrlContext, "localFallbackBaseUrl"> & { localFallbackBaseUrl?: string },
): ClientFacingUrlContext => ({
  ...context,
  localFallbackBaseUrl: context.localFallbackBaseUrl ?? appConfigProvider.config.getBaseUrl(),
});

export const resetClientFacingUrlResolverForTests = (): void => {
  singleton = null;
};
