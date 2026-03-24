import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import path from "node:path";
import type { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import type { GatewayRuntimeConfig } from "../config/runtime-config.js";
import { AutobyteusServerClient } from "../infrastructure/server-api/autobyteus-server-client.js";
import { WhatsAppBusinessAdapter } from "../infrastructure/adapters/whatsapp-business/whatsapp-business-adapter.js";
import { WhatsAppPersonalAdapter } from "../infrastructure/adapters/whatsapp-personal/whatsapp-personal-adapter.js";
import { WeComAdapter } from "../infrastructure/adapters/wecom/wecom-adapter.js";
import { WeComAppInboundStrategy } from "../infrastructure/adapters/wecom/wecom-app-inbound-strategy.js";
import { WeComAppOutboundStrategy } from "../infrastructure/adapters/wecom/wecom-app-outbound-strategy.js";
import { WeComUnifiedAdapter } from "../infrastructure/adapters/wecom/wecom-unified-adapter.js";
import { WechatPersonalAdapter } from "../infrastructure/adapters/wechat-personal/wechat-personal-adapter.js";
import { WechatSessionStateStore } from "../infrastructure/adapters/wechat-personal/session-state-store.js";
import { DiscordBusinessAdapter } from "../infrastructure/adapters/discord-business/discord-business-adapter.js";
import { DiscordPeerCandidateIndex } from "../infrastructure/adapters/discord-business/discord-peer-candidate-index.js";
import { TelegramBusinessAdapter } from "../infrastructure/adapters/telegram-business/telegram-business-adapter.js";
import { TelegramPeerCandidateIndex } from "../infrastructure/adapters/telegram-business/telegram-peer-candidate-index.js";
import type {
  InboundProviderAdapter,
  OutboundProviderAdapter,
} from "../domain/models/provider-adapter.js";
import { ChannelMentionPolicyService } from "../application/services/channel-mention-policy-service.js";
import { InboundMessageService } from "../application/services/inbound-message-service.js";
import { GatewayCapabilityService } from "../application/services/gateway-capability-service.js";
import { WhatsAppPersonalSessionService } from "../application/services/whatsapp-personal-session-service.js";
import { WechatPersonalSessionService } from "../application/services/wechat-personal-session-service.js";
import { InboundEnvelopeBridgeService } from "../application/services/inbound-envelope-bridge-service.js";
import { DiscordPeerDiscoveryService } from "../application/services/discord-peer-discovery-service.js";
import { TelegramPeerDiscoveryService } from "../application/services/telegram-peer-discovery-service.js";
import { InboundInboxService } from "../application/services/inbound-inbox-service.js";
import { InboundClassifierService } from "../application/services/inbound-classifier-service.js";
import { InboundForwarderWorker } from "../application/services/inbound-forwarder-worker.js";
import { OutboundOutboxService } from "../application/services/outbound-outbox-service.js";
import { OutboundSenderWorker } from "../application/services/outbound-sender-worker.js";
import { ReliabilityStatusService } from "../application/services/reliability-status-service.js";
import { WeComAccountRegistry } from "../infrastructure/adapters/wecom/wecom-account-registry.js";
import { SessionSupervisor } from "../infrastructure/adapters/session/session-supervisor.js";
import { SessionSupervisorRegistry } from "../infrastructure/adapters/session/session-supervisor-registry.js";
import { FileInboxStore } from "../infrastructure/inbox/file-inbox-store.js";
import { FileOutboxStore } from "../infrastructure/outbox/file-outbox-store.js";
import { FileQueueOwnerLock } from "../infrastructure/queue/file-queue-owner-lock.js";
import { registerRawBodyCaptureHook } from "../http/hooks/raw-body-capture.js";
import { registerHealthRoutes } from "../http/routes/health-route.js";
import { registerProviderWebhookRoutes } from "../http/routes/provider-webhook-route.js";
import { registerServerCallbackRoutes } from "../http/routes/server-callback-route.js";
import { registerChannelAdminRoutes } from "../http/routes/channel-admin-route.js";
import { registerWechatSidecarEventRoutes } from "../http/routes/wechat-sidecar-event-route.js";
import { registerWeComAppWebhookRoutes } from "../http/routes/wecom-app-webhook-route.js";
import { registerRuntimeReliabilityRoutes } from "../http/routes/runtime-reliability-route.js";
import { createGatewayRuntimeLifecycle } from "./gateway-runtime-lifecycle.js";

export function createGatewayApp(config: GatewayRuntimeConfig): FastifyInstance {
  const app = Fastify({ logger: false });
  app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
  registerRawBodyCaptureHook(app);

  const serverClient = new AutobyteusServerClient({
    baseUrl: config.serverBaseUrl,
    sharedSecret: config.serverSharedSecret,
  });

  const whatsappBusinessAdapter = new WhatsAppBusinessAdapter({
    appSecret: config.whatsappBusinessSecret,
  });
  const whatsappPersonalAdapter = new WhatsAppPersonalAdapter({
    authRootDir: config.whatsappPersonalAuthRoot,
    maxSessionPeerCandidates: config.whatsappPersonalPeerCandidateLimit,
    reconnectMaxAttempts: config.whatsappPersonalReconnectMaxAttempts,
    reconnectBaseDelayMs: config.whatsappPersonalReconnectBaseDelayMs,
  });
  const wecomAdapter = new WeComAdapter({
    webhookToken: config.wecomWebhookToken,
  });
  const activeWecomAppAccounts = config.wecomAppEnabled ? config.wecomAppAccounts : [];
  const wecomAccountRegistry = new WeComAccountRegistry(activeWecomAppAccounts);
  const wecomUnifiedAdapter = new WeComUnifiedAdapter({
    legacyAdapter: wecomAdapter,
    accountRegistry: wecomAccountRegistry,
    appInboundStrategy: new WeComAppInboundStrategy(wecomAdapter),
    appOutboundStrategy: new WeComAppOutboundStrategy(),
  });
  const wechatPersonalAdapter = new WechatPersonalAdapter({
    sidecarBaseUrl: config.wechatPersonalSidecarBaseUrl,
    stateStore: new WechatSessionStateStore(config.wechatPersonalStateRoot),
    restoreQrTtlSeconds: config.wechatPersonalQrTtlSeconds,
    onRestoreFailure: ({ sessionId, accountLabel, error }) => {
      console.warn("[gateway] wechat session restore failed", {
        sessionId,
        accountLabel,
        error,
      });
    },
    onUnknownInboundSession: (event) => {
      console.warn("[gateway] wechat sidecar inbound event dropped due to unknown session", {
        sessionId: event.sessionId,
        accountLabel: event.accountLabel,
      });
    },
  });
  const discordPeerCandidateIndex = config.discordEnabled
    ? new DiscordPeerCandidateIndex({
        maxCandidatesPerAccount: config.discordDiscoveryMaxCandidates,
        candidateTtlSeconds: config.discordDiscoveryTtlSeconds,
      })
    : null;
  const discordAdapter = config.discordEnabled
    ? new DiscordBusinessAdapter({
        botToken: config.discordBotToken ?? "",
        accountId: config.discordAccountId ?? "",
        peerCandidateIndex: discordPeerCandidateIndex ?? undefined,
      })
    : null;
  const discordPeerDiscoveryService = new DiscordPeerDiscoveryService(discordPeerCandidateIndex, {
    enabled: config.discordEnabled,
    accountId: config.discordAccountId,
  });
  const telegramPeerCandidateIndex = config.telegramEnabled
    ? new TelegramPeerCandidateIndex({
        maxCandidatesPerAccount: config.telegramDiscoveryMaxCandidates,
        candidateTtlSeconds: config.telegramDiscoveryTtlSeconds,
      })
    : null;
  const telegramAdapter = config.telegramEnabled
    ? new TelegramBusinessAdapter({
        accountId: config.telegramAccountId ?? "",
        botToken: config.telegramBotToken ?? "",
        pollingEnabled: config.telegramPollingEnabled,
        webhookEnabled: config.telegramWebhookEnabled,
        webhookSecretToken: config.telegramWebhookSecretToken,
        peerCandidateIndex: telegramPeerCandidateIndex ?? undefined,
      })
    : null;
  const telegramPeerDiscoveryService = new TelegramPeerDiscoveryService(telegramPeerCandidateIndex, {
    enabled: config.telegramEnabled,
    accountId: config.telegramAccountId,
  });

  const adaptersByProvider = new Map<ExternalChannelProvider, InboundProviderAdapter>();
  adaptersByProvider.set(whatsappBusinessAdapter.provider, whatsappBusinessAdapter);
  adaptersByProvider.set(wecomUnifiedAdapter.provider, wecomUnifiedAdapter);
  if (telegramAdapter) {
    adaptersByProvider.set(telegramAdapter.provider, telegramAdapter);
  }

  const queueRootDir = path.resolve(config.runtimeDataRoot, "reliability-queue");
  const inboxStore = new FileInboxStore(path.join(queueRootDir, "inbox"));
  const outboxStore = new FileOutboxStore(path.join(queueRootDir, "outbox"));
  const inboundInboxService = new InboundInboxService(inboxStore);
  const inboundClassifierService = new InboundClassifierService(new ChannelMentionPolicyService());
  const outboundOutboxService = new OutboundOutboxService(outboxStore);
  const reliabilityStatusService = new ReliabilityStatusService();

  const inboundMessageService = new InboundMessageService({
    adaptersByProvider,
    inboundInboxService,
  });

  const outboundAdaptersByRoutingKey = new Map<string, OutboundProviderAdapter>();
  outboundAdaptersByRoutingKey.set(
    `${whatsappBusinessAdapter.provider}:${whatsappBusinessAdapter.transport}`,
    whatsappBusinessAdapter,
  );
  outboundAdaptersByRoutingKey.set(
    `${wecomUnifiedAdapter.provider}:${wecomUnifiedAdapter.transport}`,
    wecomUnifiedAdapter,
  );
  outboundAdaptersByRoutingKey.set(
    `${whatsappPersonalAdapter.provider}:${whatsappPersonalAdapter.transport}`,
    whatsappPersonalAdapter,
  );
  outboundAdaptersByRoutingKey.set(
    `${wechatPersonalAdapter.provider}:${wechatPersonalAdapter.transport}`,
    wechatPersonalAdapter,
  );
  if (discordAdapter) {
    outboundAdaptersByRoutingKey.set(
      `${discordAdapter.provider}:${discordAdapter.transport}`,
      discordAdapter,
    );
  }
  if (telegramAdapter) {
    outboundAdaptersByRoutingKey.set(
      `${telegramAdapter.provider}:${telegramAdapter.transport}`,
      telegramAdapter,
    );
  }
  const sessionSupervisorRegistry = new SessionSupervisorRegistry();
  if (discordAdapter) {
    const discordSessionSupervisor = new SessionSupervisor({
      connect: () => discordAdapter.start(),
      disconnect: () => discordAdapter.stop(),
      baseDelayMs: 1_000,
      maxDelayMs: 30_000,
    });
    sessionSupervisorRegistry.register("DISCORD", discordSessionSupervisor);
  }
  if (telegramAdapter && config.telegramPollingEnabled) {
    const telegramSessionSupervisor = new SessionSupervisor({
      connect: () => telegramAdapter.start(),
      disconnect: () => telegramAdapter.stop(),
      baseDelayMs: 1_000,
      maxDelayMs: 30_000,
    });
    sessionSupervisorRegistry.register("TELEGRAM", telegramSessionSupervisor);
  }
  const inboundForwarderWorker = new InboundForwarderWorker({
    inboxService: inboundInboxService,
    classifierService: inboundClassifierService,
    serverClient,
    config: {
      batchSize: 50,
      loopIntervalMs: 300,
      maxAttempts: 8,
      baseDelayMs: 300,
      maxDelayMs: 30_000,
      backoffFactor: 2,
    },
    onLoopError: (error) => {
      console.error("[gateway] inbound forwarder worker loop error", { error });
      reliabilityStatusService.setWorkerError(
        "inboundForwarder",
        error instanceof Error ? error.message : "Inbound worker loop error.",
      );
    },
  });
  const outboundSenderWorker = new OutboundSenderWorker({
    outboxService: outboundOutboxService,
    outboundAdaptersByRoutingKey,
    config: {
      batchSize: 50,
      loopIntervalMs: 300,
      maxAttempts: config.outboundMaxAttempts,
      baseDelayMs: Math.max(50, config.outboundBaseDelayMs),
      maxDelayMs: 30_000,
      backoffFactor: 2,
    },
    onLoopError: (error) => {
      console.error("[gateway] outbound sender worker loop error", { error });
      reliabilityStatusService.setWorkerError(
        "outboundSender",
        error instanceof Error ? error.message : "Outbound worker loop error.",
      );
    },
  });

  const inboxOwnerLock = new FileQueueOwnerLock({
    rootDir: path.join(queueRootDir, "locks"),
    namespace: "inbox",
  });
  const outboxOwnerLock = new FileQueueOwnerLock({
    rootDir: path.join(queueRootDir, "locks"),
    namespace: "outbox",
  });
  const runtimeLifecycle = createGatewayRuntimeLifecycle({
    inboxOwnerLock,
    outboxOwnerLock,
    inboundForwarderWorker,
    outboundSenderWorker,
    reliabilityStatusService,
    sessionSupervisorRegistry,
    startupRestoreTasks: [
      ...(config.whatsappPersonalEnabled
        ? [
            {
              restore: () => whatsappPersonalAdapter.restorePersistedSessions(),
              onRestoreFailure: (error: unknown) => {
                console.warn("[gateway] whatsapp session restore failed", { error });
              },
            },
          ]
        : []),
      ...(config.wechatPersonalEnabled
        ? [
            {
              restore: () => wechatPersonalAdapter.restorePersistedSessions(),
              onRestoreFailure: (error: unknown) => {
                console.warn("[gateway] wechat session restore scan failed", { error });
              },
            },
          ]
        : []),
    ],
  });

  app.addHook("onReady", async () => {
    await runtimeLifecycle.start();
  });

  const sessionService = new WhatsAppPersonalSessionService(whatsappPersonalAdapter, {
    enabled: config.whatsappPersonalEnabled,
    qrTtlSeconds: config.whatsappPersonalQrTtlSeconds,
  });
  const wechatSessionService = new WechatPersonalSessionService(wechatPersonalAdapter, {
    enabled: config.wechatPersonalEnabled,
    qrTtlSeconds: config.wechatPersonalQrTtlSeconds,
  });
  const inboundEnvelopeBridgeService = new InboundEnvelopeBridgeService(inboundMessageService);
  whatsappPersonalAdapter.subscribeInbound((envelope) =>
    inboundEnvelopeBridgeService.handleEnvelope(envelope),
  );
  wechatPersonalAdapter.subscribeInbound((envelope) =>
    inboundEnvelopeBridgeService.handleEnvelope(envelope),
  );
  if (discordAdapter) {
    discordAdapter.subscribeInbound((envelope) =>
      inboundEnvelopeBridgeService.handleEnvelope(envelope),
    );
    discordAdapter.onDisconnected((reason) => {
      console.warn("[gateway] discord disconnected", {
        reason,
      });
      sessionSupervisorRegistry.markDisconnected("DISCORD", reason);
    });
  }
  if (telegramAdapter) {
    telegramAdapter.subscribeInbound((envelope) =>
      inboundEnvelopeBridgeService.handleEnvelope(envelope),
    );
    telegramAdapter.onDisconnected((reason) => {
      console.warn("[gateway] telegram disconnected", {
        reason,
      });
      sessionSupervisorRegistry.markDisconnected("TELEGRAM", reason);
    });
  }

  const capabilityService = new GatewayCapabilityService({
    wecomAppEnabled: config.wecomAppEnabled,
    wechatPersonalEnabled: config.wechatPersonalEnabled,
    defaultWeChatMode: config.wecomDefaultMode,
    discordEnabled: config.discordEnabled,
    discordAccountId: config.discordAccountId,
    telegramEnabled: config.telegramEnabled,
    telegramAccountId: config.telegramAccountId,
  });

  registerHealthRoutes(app);
  registerProviderWebhookRoutes(app, {
    inboundMessageService,
    adaptersByProvider,
  });
  if (config.wecomAppEnabled) {
    registerWeComAppWebhookRoutes(app, {
      inboundMessageService,
      wecomAdapter: wecomUnifiedAdapter,
      accountRegistry: wecomAccountRegistry,
    });
  }
  registerServerCallbackRoutes(app, {
    outboundOutboxService,
    serverCallbackSharedSecret: config.serverCallbackSharedSecret,
    allowInsecureServerCallbacks: config.allowInsecureServerCallbacks,
  });
  if (config.wechatPersonalEnabled) {
    registerWechatSidecarEventRoutes(app, {
      wechatPersonalAdapter,
      sidecarSharedSecret: config.wechatPersonalSidecarSharedSecret!,
    });
  }
  registerRuntimeReliabilityRoutes(app, {
    inboundInboxService,
    outboundOutboxService,
    reliabilityStatusService,
    adminToken: config.adminToken,
    requestShutdown: async () => {
      await app.close();
      setTimeout(() => process.exit(0), 0).unref();
    },
  });
  registerChannelAdminRoutes(app, {
    sessionService,
    wechatSessionService,
    discordPeerDiscoveryService,
    telegramPeerDiscoveryService,
    capabilityService,
    wecomAccountRegistry,
    adminToken: config.adminToken,
    defaultPeerCandidateLimit: Math.min(config.whatsappPersonalPeerCandidateLimit, 50),
    maxPeerCandidateLimit: config.whatsappPersonalPeerCandidateLimit,
    wechatDefaultPeerCandidateLimit: Math.min(config.wechatPersonalPeerCandidateLimit, 50),
    wechatMaxPeerCandidateLimit: config.wechatPersonalPeerCandidateLimit,
  });

  app.addHook("onClose", async () => {
    await runtimeLifecycle.stop();
  });

  return app;
}
