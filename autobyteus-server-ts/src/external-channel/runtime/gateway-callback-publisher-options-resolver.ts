import { appConfigProvider } from "../../config/app-config-provider.js";
import { getManagedMessagingGatewayService } from "../../managed-capabilities/messaging-gateway/defaults.js";
import type { ManagedMessagingRuntimeSnapshot } from "../../managed-capabilities/messaging-gateway/types.js";
import type { GatewayCallbackPublisherOptions } from "./gateway-callback-publisher.js";

export const resolveGatewayCallbackPublisherOptions =
  (): GatewayCallbackPublisherOptions | null => {
    const config = appConfigProvider.config;
    const sharedSecret = config.getChannelCallbackSharedSecret();
    const timeoutMs = config.getChannelCallbackTimeoutMs();
    const explicitBaseUrl = config.getChannelCallbackBaseUrl();

    if (explicitBaseUrl) {
      return {
        baseUrl: explicitBaseUrl,
        sharedSecret,
        timeoutMs,
      };
    }

    const managedBaseUrl = buildManagedMessagingCallbackBaseUrl(
      safeGetManagedMessagingRuntimeSnapshot(),
    );
    if (!managedBaseUrl) {
      return null;
    }

    return {
      baseUrl: managedBaseUrl,
      sharedSecret,
      timeoutMs,
    };
  };

export const buildManagedMessagingCallbackBaseUrl = (
  snapshot: Pick<
    ManagedMessagingRuntimeSnapshot,
    "running" | "bindHost" | "bindPort"
  > | null,
): string | null => {
  if (!snapshot?.running || !snapshot.bindHost || !snapshot.bindPort) {
    return null;
  }

  const host = normalizeManagedMessagingCallbackHost(snapshot.bindHost);
  if (!host) {
    return null;
  }

  return `http://${formatHostForUrl(host)}:${snapshot.bindPort}`;
};

const safeGetManagedMessagingRuntimeSnapshot =
  (): ManagedMessagingRuntimeSnapshot | null => {
    try {
      return getManagedMessagingGatewayService().getRuntimeSnapshot();
    } catch {
      return null;
    }
  };

const normalizeManagedMessagingCallbackHost = (value: string): string | null => {
  const normalized = value.trim().replace(/^\[|\]$/g, "");
  if (normalized.length === 0) {
    return null;
  }
  if (normalized === "0.0.0.0") {
    return "127.0.0.1";
  }
  if (normalized === "::") {
    return "::1";
  }
  return normalized;
};

const formatHostForUrl = (host: string): string =>
  host.includes(":") ? `[${host}]` : host;
