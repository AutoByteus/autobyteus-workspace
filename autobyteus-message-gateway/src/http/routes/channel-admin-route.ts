import type { FastifyInstance } from "fastify";
import type { GatewayCapabilityService } from "../../application/services/gateway-capability-service.js";
import { PersonalSessionFeatureDisabledError } from "../../application/services/whatsapp-personal-session-service.js";
import { WechatPersonalFeatureDisabledError } from "../../application/services/wechat-personal-session-service.js";
import {
  DiscordPeerDiscoveryNotEnabledError,
  type DiscordPeerDiscoveryService,
} from "../../application/services/discord-peer-discovery-service.js";
import {
  TelegramPeerDiscoveryNotEnabledError,
  type TelegramPeerDiscoveryService,
} from "../../application/services/telegram-peer-discovery-service.js";
import {
  SessionAlreadyRunningError,
  SessionNotFoundError,
  SessionQrExpiredError,
  SessionQrNotReadyError,
} from "../../infrastructure/adapters/whatsapp-personal/whatsapp-personal-adapter.js";
import type { WhatsAppPersonalSessionService } from "../../application/services/whatsapp-personal-session-service.js";
import type { WechatPersonalSessionService } from "../../application/services/wechat-personal-session-service.js";
import type { WeComAccountRegistry } from "../../infrastructure/adapters/wecom/wecom-account-registry.js";
import {
  WechatSessionAlreadyRunningError,
  WechatSessionNotFoundError,
  WechatSessionQrExpiredError,
  WechatSessionQrNotReadyError,
} from "../../infrastructure/adapters/wechat-personal/wechat-personal-adapter.js";
import { requireAdminToken } from "../middleware/require-admin-token.js";

type AdminReplyLike = {
  code: (statusCode: number) => {
    send: (payload?: unknown) => unknown;
  };
};

type ServiceUnavailableResponse = {
  code: string;
  detail: string;
};

type PeerDiscoveryRouteService = {
  listPeerCandidates: (options: {
    accountId?: string | null;
    includeGroups?: boolean;
    limit?: number;
  }) => Promise<unknown>;
};

type PersonalSessionRouteService = {
  startPersonalSession: (accountLabel: string) => Promise<{ sessionId: string }>;
  getPersonalSessionQr: (sessionId: string) => Promise<unknown>;
  getPersonalSessionStatus: (sessionId: string) => Promise<unknown>;
  listPersonalSessionPeerCandidates: (
    sessionId: string,
    options: {
      includeGroups?: boolean;
      limit?: number;
    },
  ) => Promise<unknown>;
  stopPersonalSession: (sessionId: string) => Promise<void>;
};

export type ChannelAdminDeps = {
  sessionService: WhatsAppPersonalSessionService;
  wechatSessionService?: WechatPersonalSessionService;
  discordPeerDiscoveryService?: DiscordPeerDiscoveryService;
  telegramPeerDiscoveryService?: TelegramPeerDiscoveryService;
  capabilityService?: GatewayCapabilityService;
  wecomAccountRegistry?: WeComAccountRegistry;
  adminToken?: string | null;
  defaultPeerCandidateLimit?: number;
  maxPeerCandidateLimit?: number;
  wechatDefaultPeerCandidateLimit?: number;
  wechatMaxPeerCandidateLimit?: number;
};

export function registerChannelAdminRoutes(app: FastifyInstance, deps: ChannelAdminDeps): void {
  const adminGuard = requireAdminToken(deps.adminToken);
  const defaultPeerCandidateLimit = resolvePositiveInteger(
    deps.defaultPeerCandidateLimit,
    50,
    "defaultPeerCandidateLimit",
  );
  const maxPeerCandidateLimit = resolvePositiveInteger(
    deps.maxPeerCandidateLimit,
    200,
    "maxPeerCandidateLimit",
  );
  const wechatDefaultPeerCandidateLimit = resolvePositiveInteger(
    deps.wechatDefaultPeerCandidateLimit,
    defaultPeerCandidateLimit,
    "wechatDefaultPeerCandidateLimit",
  );
  const wechatMaxPeerCandidateLimit = resolvePositiveInteger(
    deps.wechatMaxPeerCandidateLimit,
    maxPeerCandidateLimit,
    "wechatMaxPeerCandidateLimit",
  );
  const generalPeerCandidateLimits = {
    defaultLimit: defaultPeerCandidateLimit,
    maxLimit: maxPeerCandidateLimit,
  };
  const wechatPeerCandidateLimits = {
    defaultLimit: wechatDefaultPeerCandidateLimit,
    maxLimit: wechatMaxPeerCandidateLimit,
  };

  app.get("/api/channel-admin/v1/capabilities", { preHandler: adminGuard }, async (_request, reply) => {
    if (!deps.capabilityService) {
      return reply.code(503).send({
        code: "CAPABILITY_SERVICE_UNAVAILABLE",
        detail: "Gateway capability service is not configured.",
      });
    }

    return reply.code(200).send(deps.capabilityService.getCapabilities());
  });

  app.get("/api/channel-admin/v1/wecom/accounts", { preHandler: adminGuard }, async (_request, reply) => {
    const items = deps.wecomAccountRegistry?.listAccounts() ?? [];
    return reply.code(200).send({ items });
  });

  registerPeerDiscoveryRoute(app, {
    path: "/api/channel-admin/v1/discord/peer-candidates",
    adminGuard,
    service: deps.discordPeerDiscoveryService,
    unavailableResponse: {
      code: "DISCORD_DISCOVERY_NOT_ENABLED",
      detail: "Discord peer discovery is not enabled.",
    },
    ...generalPeerCandidateLimits,
  });
  registerPeerDiscoveryRoute(app, {
    path: "/api/channel-admin/v1/telegram/peer-candidates",
    adminGuard,
    service: deps.telegramPeerDiscoveryService,
    unavailableResponse: {
      code: "TELEGRAM_DISCOVERY_NOT_ENABLED",
      detail: "Telegram peer discovery is not enabled.",
    },
    ...generalPeerCandidateLimits,
  });

  registerPersonalSessionRoutes(app, {
    providerPathPrefix: "/api/channel-admin/v1/whatsapp/personal",
    adminGuard,
    service: deps.sessionService,
    ...generalPeerCandidateLimits,
  });
  registerPersonalSessionRoutes(app, {
    providerPathPrefix: "/api/channel-admin/v1/wechat/personal",
    adminGuard,
    service: deps.wechatSessionService,
    unavailableResponse: {
      code: "WECHAT_SESSION_SERVICE_UNAVAILABLE",
      detail: "WeChat session service is not configured.",
    },
    ...wechatPeerCandidateLimits,
  });
}

type PeerDiscoveryRouteOptions = {
  path: string;
  adminGuard: ReturnType<typeof requireAdminToken>;
  service?: PeerDiscoveryRouteService;
  unavailableResponse: ServiceUnavailableResponse;
  defaultLimit: number;
  maxLimit: number;
};

const registerPeerDiscoveryRoute = (
  app: FastifyInstance,
  options: PeerDiscoveryRouteOptions,
): void => {
  app.get(options.path, { preHandler: options.adminGuard }, async (request, reply) => {
    if (!options.service) {
      return reply.code(503).send(options.unavailableResponse);
    }

    try {
      const query = (request.query as Record<string, unknown>) ?? {};
      const limit = parsePeerCandidateLimit(
        query.limit,
        options.defaultLimit,
        options.maxLimit,
      );
      const includeGroups = parseBooleanQuery(query.includeGroups, true, "includeGroups");
      const accountId =
        typeof query.accountId === "string" && query.accountId.trim().length > 0
          ? query.accountId.trim()
          : null;
      const result = await options.service.listPeerCandidates({
        accountId,
        includeGroups,
        limit,
      });
      return reply.code(200).send(result);
    } catch (error) {
      return handleAdminError(reply, error);
    }
  });
};

type PersonalSessionRouteOptions = {
  providerPathPrefix: string;
  adminGuard: ReturnType<typeof requireAdminToken>;
  service?: PersonalSessionRouteService;
  unavailableResponse?: ServiceUnavailableResponse;
  defaultLimit: number;
  maxLimit: number;
};

const registerPersonalSessionRoutes = (
  app: FastifyInstance,
  options: PersonalSessionRouteOptions,
): void => {
  const sessionCollectionPath = `${options.providerPathPrefix}/sessions`;
  const sessionPath = `${sessionCollectionPath}/:sessionId`;

  app.post(sessionCollectionPath, { preHandler: options.adminGuard }, async (request, reply) => {
    const service = resolvePersonalSessionService(options.service, options.unavailableResponse, reply);
    if (!service) {
      return;
    }

    try {
      const body = (request.body as Record<string, unknown>) ?? {};
      const accountLabel =
        typeof body.accountLabel === "string" && body.accountLabel.trim().length > 0
          ? body.accountLabel
          : "default";
      const result = await service.startPersonalSession(accountLabel);
      return reply.code(201).send(result);
    } catch (error) {
      return handleAdminError(reply, error);
    }
  });

  app.get(`${sessionPath}/qr`, { preHandler: options.adminGuard }, async (request, reply) => {
    const service = resolvePersonalSessionService(options.service, options.unavailableResponse, reply);
    if (!service) {
      return;
    }

    try {
      const sessionId = (request.params as { sessionId: string }).sessionId;
      const result = await service.getPersonalSessionQr(sessionId);
      return reply.code(200).send(result);
    } catch (error) {
      return handleAdminError(reply, error);
    }
  });

  app.get(`${sessionPath}/status`, { preHandler: options.adminGuard }, async (request, reply) => {
    const service = resolvePersonalSessionService(options.service, options.unavailableResponse, reply);
    if (!service) {
      return;
    }

    try {
      const sessionId = (request.params as { sessionId: string }).sessionId;
      const status = await service.getPersonalSessionStatus(sessionId);
      return reply.code(200).send(status);
    } catch (error) {
      return handleAdminError(reply, error);
    }
  });

  app.get(
    `${sessionPath}/peer-candidates`,
    { preHandler: options.adminGuard },
    async (request, reply) => {
      const service = resolvePersonalSessionService(
        options.service,
        options.unavailableResponse,
        reply,
      );
      if (!service) {
        return;
      }

      try {
        const sessionId = (request.params as { sessionId: string }).sessionId;
        const query = (request.query as Record<string, unknown>) ?? {};
        const limit = parsePeerCandidateLimit(
          query.limit,
          options.defaultLimit,
          options.maxLimit,
        );
        const includeGroups = parseBooleanQuery(query.includeGroups, true, "includeGroups");
        const result = await service.listPersonalSessionPeerCandidates(sessionId, {
          limit,
          includeGroups,
        });
        return reply.code(200).send(result);
      } catch (error) {
        return handleAdminError(reply, error);
      }
    },
  );

  app.delete(sessionPath, { preHandler: options.adminGuard }, async (request, reply) => {
    const service = resolvePersonalSessionService(options.service, options.unavailableResponse, reply);
    if (!service) {
      return;
    }

    try {
      const sessionId = (request.params as { sessionId: string }).sessionId;
      await service.stopPersonalSession(sessionId);
      return reply.code(204).send();
    } catch (error) {
      return handleAdminError(reply, error);
    }
  });
};

const resolvePersonalSessionService = (
  service: PersonalSessionRouteService | undefined,
  unavailableResponse: ServiceUnavailableResponse | undefined,
  reply: AdminReplyLike,
): PersonalSessionRouteService | null => {
  if (service) {
    return service;
  }
  if (unavailableResponse) {
    reply.code(503).send(unavailableResponse);
    return null;
  }
  throw new Error("Personal session service is not configured.");
};

const handleAdminError = (
  reply: AdminReplyLike,
  error: unknown,
): unknown => {
  if (
    error instanceof PersonalSessionFeatureDisabledError ||
    error instanceof WechatPersonalFeatureDisabledError
  ) {
    return reply.code(403).send({
      code: "PERSONAL_SESSION_DISABLED",
      detail: error.message,
    });
  }

  if (
    error instanceof SessionQrExpiredError ||
    error instanceof WechatSessionQrExpiredError
  ) {
    return reply.code(410).send({
      code: "SESSION_QR_EXPIRED",
      detail: error.message,
      expiresAt: error.expiresAt,
    });
  }

  if (
    error instanceof SessionQrNotReadyError ||
    error instanceof WechatSessionQrNotReadyError
  ) {
    return reply.code(409).send({
      code: "SESSION_QR_NOT_READY",
      detail: error.message,
    });
  }

  if (
    error instanceof SessionAlreadyRunningError ||
    error instanceof WechatSessionAlreadyRunningError
  ) {
    return reply.code(409).send({
      code: "SESSION_ALREADY_RUNNING",
      detail: error.message,
      sessionId: error.sessionId,
    });
  }

  if (
    error instanceof SessionNotFoundError ||
    error instanceof WechatSessionNotFoundError
  ) {
    return reply.code(404).send({
      code: "SESSION_NOT_FOUND",
      detail: error.message,
    });
  }

  if (error instanceof DiscordPeerDiscoveryNotEnabledError) {
    return reply.code(503).send({
      code: error.code,
      detail: error.message,
    });
  }

  if (error instanceof TelegramPeerDiscoveryNotEnabledError) {
    return reply.code(503).send({
      code: error.code,
      detail: error.message,
    });
  }

  if (error instanceof Error) {
    return reply.code(400).send({
      code: "INVALID_REQUEST",
      detail: error.message,
    });
  }

  return reply.code(500).send({
    code: "CHANNEL_ADMIN_INTERNAL_ERROR",
    detail: "Unexpected channel admin error.",
  });
};

const parsePeerCandidateLimit = (
  raw: unknown,
  fallback: number,
  maxLimit: number,
): number => {
  if (raw === undefined || raw === null || raw === "") {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("limit must be a positive integer.");
  }

  return Math.min(parsed, maxLimit);
};

const parseBooleanQuery = (raw: unknown, fallback: boolean, key: string): boolean => {
  if (raw === undefined || raw === null || raw === "") {
    return fallback;
  }
  if (typeof raw === "boolean") {
    return raw;
  }
  if (typeof raw === "number") {
    if (raw === 1) {
      return true;
    }
    if (raw === 0) {
      return false;
    }
  }
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (["true", "1", "yes"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no"].includes(normalized)) {
      return false;
    }
  }

  throw new Error(`${key} must be a boolean value.`);
};

const resolvePositiveInteger = (value: number | undefined, fallback: number, key: string): number => {
  if (value === undefined) {
    return fallback;
  }
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${key} must be a positive integer.`);
  }
  return value;
};
