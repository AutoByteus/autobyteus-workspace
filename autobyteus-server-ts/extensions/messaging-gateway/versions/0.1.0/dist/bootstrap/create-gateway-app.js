import Fastify from "fastify";
import cors from "@fastify/cors";
import path from "node:path";
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
import { FileQueueOwnerLock, QueueOwnerLockLostError, } from "../infrastructure/queue/file-queue-owner-lock.js";
import { registerRawBodyCaptureHook } from "../http/hooks/raw-body-capture.js";
import { registerHealthRoutes } from "../http/routes/health-route.js";
import { registerProviderWebhookRoutes } from "../http/routes/provider-webhook-route.js";
import { registerServerCallbackRoutes } from "../http/routes/server-callback-route.js";
import { registerChannelAdminRoutes } from "../http/routes/channel-admin-route.js";
import { registerWechatSidecarEventRoutes } from "../http/routes/wechat-sidecar-event-route.js";
import { registerWeComAppWebhookRoutes } from "../http/routes/wecom-app-webhook-route.js";
import { registerRuntimeReliabilityRoutes } from "../http/routes/runtime-reliability-route.js";
export function createGatewayApp(config) {
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
    const wecomAccountRegistry = new WeComAccountRegistry(config.wecomAppAccounts);
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
            maxCandidatesPerAccount: 200,
            candidateTtlSeconds: 7 * 24 * 60 * 60,
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
    const adaptersByProvider = new Map();
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
    const outboundAdaptersByRoutingKey = new Map();
    outboundAdaptersByRoutingKey.set(`${whatsappBusinessAdapter.provider}:${whatsappBusinessAdapter.transport}`, whatsappBusinessAdapter);
    outboundAdaptersByRoutingKey.set(`${wecomUnifiedAdapter.provider}:${wecomUnifiedAdapter.transport}`, wecomUnifiedAdapter);
    outboundAdaptersByRoutingKey.set(`${whatsappPersonalAdapter.provider}:${whatsappPersonalAdapter.transport}`, whatsappPersonalAdapter);
    outboundAdaptersByRoutingKey.set(`${wechatPersonalAdapter.provider}:${wechatPersonalAdapter.transport}`, wechatPersonalAdapter);
    if (discordAdapter) {
        outboundAdaptersByRoutingKey.set(`${discordAdapter.provider}:${discordAdapter.transport}`, discordAdapter);
    }
    if (telegramAdapter) {
        outboundAdaptersByRoutingKey.set(`${telegramAdapter.provider}:${telegramAdapter.transport}`, telegramAdapter);
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
            reliabilityStatusService.setWorkerError("inboundForwarder", error instanceof Error ? error.message : "Inbound worker loop error.");
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
            reliabilityStatusService.setWorkerError("outboundSender", error instanceof Error ? error.message : "Outbound worker loop error.");
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
    const lockHeartbeatIntervalMs = 5_000;
    let lockHeartbeatTimer = null;
    const acquireQueueLockPair = async () => {
        await inboxOwnerLock.acquire();
        try {
            await outboxOwnerLock.acquire();
        }
        catch (error) {
            await inboxOwnerLock.release().catch(() => undefined);
            throw error;
        }
    };
    app.addHook("onReady", async () => {
        await acquireQueueLockPair();
        reliabilityStatusService.setLockHeld("inbox", inboxOwnerLock.getOwnerId());
        reliabilityStatusService.setLockHeld("outbox", outboxOwnerLock.getOwnerId());
        if (config.whatsappPersonalEnabled) {
            await whatsappPersonalAdapter.restorePersistedSessions().catch((error) => {
                console.warn("[gateway] whatsapp session restore failed", { error });
            });
        }
        if (config.wechatPersonalEnabled) {
            await wechatPersonalAdapter.restorePersistedSessions().catch((error) => {
                console.warn("[gateway] wechat session restore scan failed", { error });
            });
        }
        inboundForwarderWorker.start();
        outboundSenderWorker.start();
        reliabilityStatusService.setWorkerRunning("inboundForwarder", true);
        reliabilityStatusService.setWorkerRunning("outboundSender", true);
        await sessionSupervisorRegistry.startAll();
        lockHeartbeatTimer = setInterval(() => {
            void inboxOwnerLock
                .heartbeat()
                .then(() => {
                reliabilityStatusService.setLockHeartbeat("inbox");
            })
                .catch((error) => {
                console.error("[gateway] inbox lock heartbeat failed", { error });
                void inboundForwarderWorker.stop();
                void outboundSenderWorker.stop();
                reliabilityStatusService.setWorkerRunning("inboundForwarder", false);
                reliabilityStatusService.setWorkerRunning("outboundSender", false);
                if (error instanceof QueueOwnerLockLostError) {
                    console.error("[gateway] queue lock ownership lost; workers stopped");
                    reliabilityStatusService.markLockLost("inbox", error.message);
                    return;
                }
                reliabilityStatusService.setWorkerError("inboundForwarder", error instanceof Error ? error.message : "Inbox heartbeat error.");
            });
            void outboxOwnerLock
                .heartbeat()
                .then(() => {
                reliabilityStatusService.setLockHeartbeat("outbox");
            })
                .catch((error) => {
                console.error("[gateway] outbox lock heartbeat failed", { error });
                void inboundForwarderWorker.stop();
                void outboundSenderWorker.stop();
                reliabilityStatusService.setWorkerRunning("inboundForwarder", false);
                reliabilityStatusService.setWorkerRunning("outboundSender", false);
                if (error instanceof QueueOwnerLockLostError) {
                    console.error("[gateway] queue lock ownership lost; workers stopped");
                    reliabilityStatusService.markLockLost("outbox", error.message);
                    return;
                }
                reliabilityStatusService.setWorkerError("outboundSender", error instanceof Error ? error.message : "Outbox heartbeat error.");
            });
        }, lockHeartbeatIntervalMs);
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
    whatsappPersonalAdapter.subscribeInbound((envelope) => inboundEnvelopeBridgeService.handleEnvelope(envelope));
    wechatPersonalAdapter.subscribeInbound((envelope) => inboundEnvelopeBridgeService.handleEnvelope(envelope));
    if (discordAdapter) {
        discordAdapter.subscribeInbound((envelope) => inboundEnvelopeBridgeService.handleEnvelope(envelope));
        discordAdapter.onDisconnected((reason) => {
            console.warn("[gateway] discord disconnected", {
                reason,
            });
            sessionSupervisorRegistry.markDisconnected("DISCORD", reason);
        });
    }
    if (telegramAdapter) {
        telegramAdapter.subscribeInbound((envelope) => inboundEnvelopeBridgeService.handleEnvelope(envelope));
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
    registerWeComAppWebhookRoutes(app, {
        inboundMessageService,
        wecomAdapter: wecomUnifiedAdapter,
        accountRegistry: wecomAccountRegistry,
    });
    registerServerCallbackRoutes(app, {
        outboundOutboxService,
        serverCallbackSharedSecret: config.serverCallbackSharedSecret,
        allowInsecureServerCallbacks: config.allowInsecureServerCallbacks,
    });
    if (config.wechatPersonalEnabled) {
        registerWechatSidecarEventRoutes(app, {
            wechatPersonalAdapter,
            sidecarSharedSecret: config.wechatPersonalSidecarSharedSecret,
        });
    }
    registerRuntimeReliabilityRoutes(app, {
        inboundInboxService,
        outboundOutboxService,
        reliabilityStatusService,
        adminToken: config.adminToken,
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
        if (lockHeartbeatTimer) {
            clearInterval(lockHeartbeatTimer);
            lockHeartbeatTimer = null;
        }
        await inboundForwarderWorker.stop();
        await outboundSenderWorker.stop();
        await sessionSupervisorRegistry.stopAll();
        reliabilityStatusService.setWorkerRunning("inboundForwarder", false);
        reliabilityStatusService.setWorkerRunning("outboundSender", false);
        await inboxOwnerLock.release();
        await outboxOwnerLock.release();
        reliabilityStatusService.setLockReleased("inbox");
        reliabilityStatusService.setLockReleased("outbox");
    });
    return app;
}
//# sourceMappingURL=create-gateway-app.js.map