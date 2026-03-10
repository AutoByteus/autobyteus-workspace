import { appConfigProvider } from "../../config/app-config-provider.js";
import { getManagedMessagingGatewayService } from "../../managed-capabilities/messaging-gateway/defaults.js";
import type { ManagedMessagingStatus } from "../../managed-capabilities/messaging-gateway/types.js";
import type { GatewayCallbackPublisherOptions } from "./gateway-callback-publisher.js";

export type GatewayCallbackDispatchTarget =
  | {
      state: "AVAILABLE";
      options: GatewayCallbackPublisherOptions;
      reason: null;
    }
  | {
      state: "UNAVAILABLE" | "DISABLED";
      options: null;
      reason: string;
    };

export const resolveGatewayCallbackDispatchTarget =
  async (): Promise<GatewayCallbackDispatchTarget> => {
    const config = appConfigProvider.config;
    const sharedSecret = config.getChannelCallbackSharedSecret();
    const timeoutMs = config.getChannelCallbackTimeoutMs();
    const explicitBaseUrl = normalizeOptionalString(config.getChannelCallbackBaseUrl());

    if (explicitBaseUrl) {
      return {
        state: "AVAILABLE",
        options: {
          baseUrl: explicitBaseUrl,
          sharedSecret,
          timeoutMs,
        },
        reason: null,
      };
    }

    const managedStatus = await safeGetManagedMessagingStatus();
    if (!managedStatus?.enabled) {
      return {
        state: "DISABLED",
        options: null,
        reason: "Channel callback delivery is not configured.",
      };
    }

    if (managedStatus.lifecycleState !== "RUNNING" || !managedStatus.runtimeRunning) {
      return {
        state: "UNAVAILABLE",
        options: null,
        reason: "Managed messaging gateway target is not currently available.",
      };
    }

    const managedBaseUrl = buildManagedMessagingCallbackBaseUrl({
      bindHost: managedStatus.bindHost,
      bindPort: managedStatus.bindPort,
    });
    if (!managedBaseUrl) {
      return {
        state: "UNAVAILABLE",
        options: null,
        reason: "Managed messaging gateway target is not currently resolvable.",
      };
    }

    return {
      state: "AVAILABLE",
      options: {
        baseUrl: managedBaseUrl,
        sharedSecret,
        timeoutMs,
      },
      reason: null,
    };
  };

export const buildManagedMessagingCallbackBaseUrl = (
  snapshot: Pick<ManagedMessagingStatus, "bindHost" | "bindPort"> | null,
): string | null => {
  if (!snapshot?.bindHost || !snapshot.bindPort) {
    return null;
  }

  const host = normalizeManagedMessagingCallbackHost(snapshot.bindHost);
  if (!host) {
    return null;
  }

  return `http://${formatHostForUrl(host)}:${snapshot.bindPort}`;
};

const safeGetManagedMessagingStatus =
  async (): Promise<ManagedMessagingStatus | null> => {
    try {
      return await getManagedMessagingGatewayService().getStatus();
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

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};
