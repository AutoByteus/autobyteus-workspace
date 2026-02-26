import { createHmac } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import Fastify from "fastify";
import { WechatyBuilder } from "wechaty";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultEnvFile = path.resolve(__dirname, "../.env");

dotenv.config({
  path: process.env.WECHATY_SIDECAR_ENV_FILE ?? defaultEnvFile,
  override: false,
});

const config = loadConfig(process.env);
const app = Fastify({
  logger: {
    level: config.logLevel,
  },
});

const sessions = new Map();

app.get("/health", async () => ({
  status: "ok",
  timestamp: new Date().toISOString(),
  sessions: sessions.size,
}));

app.post("/api/wechaty/v1/sessions/open", async (request, reply) => {
  try {
    const input = normalizeOpenSessionInput(request.body);
    const existing = sessions.get(input.sessionId);
    if (existing && existing.status !== "STOPPED") {
      return {
        status: existing.status,
        qr: existing.qr,
      };
    }

    if (existing && existing.status === "STOPPED") {
      await stopSession(existing, true);
      sessions.delete(existing.sessionId);
    }

    const record = await createSession(input);
    sessions.set(record.sessionId, record);

    return {
      status: record.status,
      qr: record.qr,
    };
  } catch (error) {
    return sendError(reply, 400, toErrorDetail(error));
  }
});

app.delete("/api/wechaty/v1/sessions/:sessionId", async (request, reply) => {
  const { sessionId } = request.params;
  const record = sessions.get(sessionId);
  if (!record) {
    return sendError(reply, 404, `Session ${sessionId} was not found.`);
  }

  await stopSession(record, true);
  return reply.code(204).send();
});

app.get("/api/wechaty/v1/sessions/:sessionId/status", async (request, reply) => {
  const { sessionId } = request.params;
  const record = sessions.get(sessionId);
  if (!record) {
    return sendError(reply, 404, `Session ${sessionId} was not found.`);
  }

  return {
    status: record.status,
    updatedAt: record.updatedAt,
  };
});

app.get("/api/wechaty/v1/sessions/:sessionId/qr", async (request, reply) => {
  const { sessionId } = request.params;
  const record = sessions.get(sessionId);
  if (!record) {
    return sendError(reply, 404, `Session ${sessionId} was not found.`);
  }

  return {
    qr: record.qr,
  };
});

app.get("/api/wechaty/v1/sessions/:sessionId/peer-candidates", async (request, reply) => {
  const { sessionId } = request.params;
  const record = sessions.get(sessionId);
  if (!record) {
    return sendError(reply, 404, `Session ${sessionId} was not found.`);
  }

  const query = request.query;
  const limit = normalizePositiveInteger(query.limit, 50, "limit");
  const includeGroups = normalizeBoolean(query.includeGroups, true);

  try {
    const items = await listPeerCandidates(record, {
      limit,
      includeGroups,
    });

    return {
      items,
    };
  } catch (error) {
    return sendError(reply, 500, toErrorDetail(error));
  }
});

app.post("/api/wechaty/v1/sessions/:sessionId/messages", async (request, reply) => {
  const { sessionId } = request.params;
  const record = sessions.get(sessionId);
  if (!record) {
    return sendError(reply, 404, `Session ${sessionId} was not found.`);
  }

  try {
    const payload = normalizeOutboundInput(request.body);
    const sendResult = await sendMessage(record, payload);
    return {
      providerMessageId: sendResult.providerMessageId,
      deliveredAt: sendResult.deliveredAt,
      metadata: sendResult.metadata,
    };
  } catch (error) {
    return sendError(reply, 400, toErrorDetail(error));
  }
});

app.addHook("onClose", async () => {
  const stopPromises = [];
  for (const record of sessions.values()) {
    stopPromises.push(stopSession(record, false));
  }
  await Promise.allSettled(stopPromises);
});

const start = async () => {
  try {
    await app.listen({
      host: config.host,
      port: config.port,
    });
    app.log.info(
      {
        host: config.host,
        port: config.port,
        gatewayBaseUrl: config.gatewayBaseUrl,
        puppet: config.wechatyPuppet,
      },
      "wechaty sidecar started",
    );
    if (!config.gatewayBaseUrl) {
      app.log.warn(
        "GATEWAY_BASE_URL is empty; inbound messages will not be forwarded to gateway.",
      );
    }
    if (!config.sidecarSharedSecret) {
      app.log.warn(
        "SIDECAR_SHARED_SECRET is empty; inbound messages will not be forwarded to gateway.",
      );
    }
  } catch (error) {
    app.log.error({ err: error }, "failed to start wechaty sidecar");
    process.exit(1);
  }
};

void start();

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    app.log.info({ signal }, "shutdown signal received");
    void app.close().finally(() => {
      process.exit(0);
    });
  });
}

async function createSession(input) {
  const nowIso = new Date().toISOString();
  const record = {
    sessionId: input.sessionId,
    accountLabel: input.accountLabel,
    status: "PENDING_QR",
    createdAt: nowIso,
    updatedAt: nowIso,
    qrTtlSeconds: input.qrTtlSeconds,
    qr: null,
    peerCache: new Map(),
    bot: null,
  };

  const puppetOptions = buildPuppetOptions(config);
  const bot = WechatyBuilder.build({
    name: input.sessionId,
    puppet: config.wechatyPuppet,
    puppetOptions,
  });

  record.bot = bot;

  bot.on("scan", (qrcode, status) => {
    if (typeof qrcode === "string" && qrcode.trim().length > 0) {
      record.qr = {
        code: qrcode,
        qr: qrcode,
        expiresAt: new Date(Date.now() + record.qrTtlSeconds * 1000).toISOString(),
      };
      record.status = "PENDING_QR";
      record.updatedAt = new Date().toISOString();
    }
    app.log.info(
      {
        sessionId: record.sessionId,
        status,
      },
      "wechaty scan event",
    );
  });

  bot.on("login", (user) => {
    record.status = "ACTIVE";
    record.qr = null;
    record.updatedAt = new Date().toISOString();
    app.log.info(
      {
        sessionId: record.sessionId,
        accountLabel: record.accountLabel,
        userId: user?.id,
      },
      "wechaty session logged in",
    );
  });

  bot.on("logout", (user) => {
    record.status = "DEGRADED";
    record.updatedAt = new Date().toISOString();
    app.log.warn(
      {
        sessionId: record.sessionId,
        userId: user?.id,
      },
      "wechaty session logged out",
    );
  });

  bot.on("error", (error) => {
    record.status = "DEGRADED";
    record.updatedAt = new Date().toISOString();
    app.log.error(
      {
        sessionId: record.sessionId,
        err: error,
      },
      "wechaty bot error",
    );
  });

  bot.on("message", async (message) => {
    try {
      await handleInboundMessage(record, message);
    } catch (error) {
      app.log.error(
        {
          sessionId: record.sessionId,
          err: error,
        },
        "failed to process inbound wechat message",
      );
    }
  });

  await bot.start();
  record.updatedAt = new Date().toISOString();

  return record;
}

async function stopSession(record, explicitStop) {
  if (!record || !record.bot) {
    return;
  }

  try {
    await record.bot.stop();
  } catch (error) {
    app.log.warn(
      {
        sessionId: record.sessionId,
        err: error,
      },
      "wechaty bot stop failed",
    );
  }

  record.status = explicitStop ? "STOPPED" : record.status;
  record.updatedAt = new Date().toISOString();
}

async function handleInboundMessage(record, message) {
  if (typeof message?.self === "function" && message.self()) {
    return;
  }

  const text =
    typeof message?.text === "function" ? String(message.text() ?? "").trim() : "";
  if (text.length === 0) {
    return;
  }

  const talker = typeof message?.talker === "function" ? message.talker() : null;
  const room = typeof message?.room === "function" ? message.room() : null;

  const peerType = room ? "GROUP" : "USER";
  const peerId = room?.id ?? talker?.id ?? null;
  if (!peerId) {
    return;
  }

  const displayName = room
    ? await resolveRoomTopic(room)
    : resolveContactName(talker);

  const receivedAt = normalizeReceivedAt(message);
  const inboundEvent = {
    sessionId: record.sessionId,
    accountLabel: record.accountLabel,
    peerId,
    peerType,
    threadId: room?.id ?? null,
    messageId: normalizeOptionalString(message?.id),
    content: text,
    receivedAt,
    metadata: {
      source: "wechaty-sidecar",
      talkerId: talker?.id ?? null,
      roomId: room?.id ?? null,
    },
  };

  trackPeer(record, {
    peerId,
    peerType,
    threadId: room?.id ?? null,
    displayName,
    lastMessageAt: receivedAt,
  });

  await forwardInboundEventToGateway(inboundEvent);
}

function trackPeer(record, peer) {
  const previous = record.peerCache.get(peer.peerId);
  if (!previous || previous.lastMessageAt <= peer.lastMessageAt) {
    record.peerCache.set(peer.peerId, peer);
  }
}

async function listPeerCandidates(record, options) {
  const merged = new Map();

  for (const item of record.peerCache.values()) {
    merged.set(item.peerId, item);
  }

  if (record.bot?.Contact?.findAll) {
    const contacts = await record.bot.Contact.findAll();
    for (const contact of contacts) {
      const peerId = normalizeOptionalString(contact?.id);
      if (!peerId) {
        continue;
      }
      const next = {
        peerId,
        peerType: "USER",
        threadId: null,
        displayName: resolveContactName(contact),
        lastMessageAt: new Date(0).toISOString(),
      };
      merged.set(peerId, preferLatestPeer(merged.get(peerId), next));
    }
  }

  if (options.includeGroups && record.bot?.Room?.findAll) {
    const rooms = await record.bot.Room.findAll();
    for (const room of rooms) {
      const peerId = normalizeOptionalString(room?.id);
      if (!peerId) {
        continue;
      }
      const next = {
        peerId,
        peerType: "GROUP",
        threadId: peerId,
        displayName: await resolveRoomTopic(room),
        lastMessageAt: new Date(0).toISOString(),
      };
      merged.set(peerId, preferLatestPeer(merged.get(peerId), next));
    }
  }

  const items = Array.from(merged.values())
    .filter((item) => (options.includeGroups ? true : item.peerType !== "GROUP"))
    .sort((left, right) => right.lastMessageAt.localeCompare(left.lastMessageAt))
    .slice(0, options.limit);

  return items;
}

function preferLatestPeer(previous, next) {
  if (!previous) {
    return next;
  }
  if (previous.lastMessageAt > next.lastMessageAt) {
    return previous;
  }
  if (previous.lastMessageAt < next.lastMessageAt) {
    return next;
  }

  return {
    ...next,
    displayName: next.displayName ?? previous.displayName,
  };
}

async function sendMessage(record, payload) {
  if (record.status !== "ACTIVE") {
    throw new Error(`Session ${record.sessionId} is not ACTIVE.`);
  }

  const target = await resolveOutboundTarget(record, payload);
  if (!target) {
    throw new Error(
      `Could not resolve outbound target for peerId=${payload.peerId} threadId=${payload.threadId}.`,
    );
  }

  const sent = await target.say(payload.text);
  const providerMessageId = extractMessageId(sent);

  return {
    providerMessageId,
    deliveredAt: new Date().toISOString(),
    metadata: {
      targetType: payload.threadId ? "ROOM" : target.id === payload.peerId ? "CONTACT_OR_ROOM" : "ROOM",
    },
  };
}

async function resolveOutboundTarget(record, payload) {
  if (payload.threadId) {
    return findRoomById(record.bot, payload.threadId);
  }

  const directContact = await findContactById(record.bot, payload.peerId);
  if (directContact) {
    return directContact;
  }

  return findRoomById(record.bot, payload.peerId);
}

async function findContactById(bot, peerId) {
  if (!bot?.Contact) {
    return null;
  }

  if (typeof bot.Contact.find === "function") {
    try {
      const contact = await bot.Contact.find({ id: peerId });
      if (contact) {
        return contact;
      }
    } catch {
      // fall through
    }
  }

  if (typeof bot.Contact.findAll === "function") {
    const contacts = await bot.Contact.findAll();
    return contacts.find((item) => item?.id === peerId) ?? null;
  }

  return null;
}

async function findRoomById(bot, roomId) {
  if (!bot?.Room) {
    return null;
  }

  if (typeof bot.Room.find === "function") {
    try {
      const room = await bot.Room.find({ id: roomId });
      if (room) {
        return room;
      }
    } catch {
      // fall through
    }
  }

  if (typeof bot.Room.findAll === "function") {
    const rooms = await bot.Room.findAll();
    return rooms.find((item) => item?.id === roomId) ?? null;
  }

  return null;
}

function extractMessageId(sent) {
  if (sent && typeof sent === "object") {
    if (typeof sent.id === "string" && sent.id.length > 0) {
      return sent.id;
    }
    if (Array.isArray(sent) && sent.length > 0) {
      const first = sent[0];
      if (first && typeof first.id === "string" && first.id.length > 0) {
        return first.id;
      }
    }
  }
  return null;
}

async function resolveRoomTopic(room) {
  if (!room || typeof room.topic !== "function") {
    return null;
  }
  const maybeTopic = room.topic();
  const topic =
    maybeTopic && typeof maybeTopic.then === "function"
      ? await maybeTopic
      : maybeTopic;
  return normalizeOptionalString(topic);
}

function resolveContactName(contact) {
  if (!contact || typeof contact.name !== "function") {
    return null;
  }
  return normalizeOptionalString(contact.name());
}

function normalizeReceivedAt(message) {
  if (typeof message?.date === "function") {
    const maybeDate = message.date();
    if (maybeDate instanceof Date && Number.isFinite(maybeDate.getTime())) {
      return maybeDate.toISOString();
    }
  }
  return new Date().toISOString();
}

async function forwardInboundEventToGateway(payload) {
  if (!config.gatewayBaseUrl || !config.sidecarSharedSecret) {
    return;
  }

  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createSignature(body, timestamp, config.sidecarSharedSecret);
  const url = `${config.gatewayBaseUrl}/api/wechat-sidecar/v1/events`;

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, config.gatewayTimeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-autobyteus-sidecar-signature": signature,
        "x-autobyteus-sidecar-timestamp": timestamp,
      },
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text();
      app.log.warn(
        {
          statusCode: response.status,
          detail,
          sessionId: payload.sessionId,
        },
        "gateway inbound callback rejected by gateway",
      );
    }
  } catch (error) {
    app.log.warn(
      {
        err: error,
        sessionId: payload.sessionId,
      },
      "failed to post inbound event to gateway",
    );
  } finally {
    clearTimeout(timeout);
  }
}

function createSignature(body, timestamp, secret) {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
}

function normalizeOpenSessionInput(body) {
  const source = body && typeof body === "object" ? body : {};
  const sessionId = normalizeRequiredString(source.sessionId, "sessionId");
  const accountLabel = normalizeRequiredString(source.accountLabel, "accountLabel");
  const qrTtlSeconds = normalizePositiveInteger(
    source.qrTtlSeconds,
    120,
    "qrTtlSeconds",
  );
  return {
    sessionId,
    accountLabel,
    qrTtlSeconds,
  };
}

function normalizeOutboundInput(body) {
  const source = body && typeof body === "object" ? body : {};
  const peerId = normalizeRequiredString(source.peerId, "peerId");
  const threadId = normalizeNullableString(source.threadId);
  const text = normalizeRequiredString(source.text, "text");
  return {
    peerId,
    threadId,
    text,
  };
}

function normalizeRequiredString(value, key) {
  if (typeof value !== "string") {
    throw new Error(`${key} must be a non-empty string.`);
  }
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${key} must be a non-empty string.`);
  }
  return normalized;
}

function normalizeNullableString(value) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeOptionalString(value) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizePositiveInteger(value, fallback, key) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${key} must be a positive integer.`);
  }
  return parsed;
}

function normalizeBoolean(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no"].includes(normalized)) {
    return false;
  }
  return fallback;
}

function toErrorDetail(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unexpected sidecar error.";
}

function sendError(reply, statusCode, detail) {
  return reply.code(statusCode).send({
    detail,
  });
}

function buildPuppetOptions(currentConfig) {
  const options = currentConfig.wechatyPuppetOptions
    ? { ...currentConfig.wechatyPuppetOptions }
    : {};

  if (currentConfig.wechatyPuppetServiceToken) {
    options.token = currentConfig.wechatyPuppetServiceToken;
  }

  if (currentConfig.wechatyPuppetServiceEndpoint) {
    options.endpoint = currentConfig.wechatyPuppetServiceEndpoint;
  }

  return options;
}

function loadConfig(env) {
  return {
    host: env.SIDECAR_HOST?.trim() || "0.0.0.0",
    port: normalizePositiveInteger(env.SIDECAR_PORT, 8788, "SIDECAR_PORT"),
    gatewayBaseUrl: normalizeBaseUrl(env.GATEWAY_BASE_URL),
    sidecarSharedSecret: normalizeOptionalString(env.SIDECAR_SHARED_SECRET),
    wechatyPuppet: env.WECHATY_PUPPET?.trim() || "wechaty-puppet-service",
    wechatyPuppetServiceToken: normalizeOptionalString(
      env.WECHATY_PUPPET_SERVICE_TOKEN ?? env.WECHATY_TOKEN,
    ),
    wechatyPuppetServiceEndpoint: normalizeOptionalString(
      env.WECHATY_PUPPET_SERVICE_ENDPOINT,
    ),
    wechatyPuppetOptions: parseOptionalJson(
      env.WECHATY_PUPPET_OPTIONS_JSON,
      "WECHATY_PUPPET_OPTIONS_JSON",
    ),
    gatewayTimeoutMs: normalizePositiveInteger(
      env.SIDECAR_GATEWAY_TIMEOUT_MS,
      10_000,
      "SIDECAR_GATEWAY_TIMEOUT_MS",
    ),
    logLevel: normalizeLogLevel(env.SIDECAR_LOG_LEVEL),
  };
}

function normalizeBaseUrl(raw) {
  const value = normalizeOptionalString(raw);
  if (!value) {
    return null;
  }
  return value.replace(/\/+$/, "");
}

function parseOptionalJson(raw, key) {
  const value = normalizeOptionalString(raw);
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
    throw new Error();
  } catch {
    throw new Error(`${key} must be a valid JSON object.`);
  }
}

function normalizeLogLevel(raw) {
  const value = normalizeOptionalString(raw)?.toLowerCase() ?? "info";
  const allowed = new Set(["trace", "debug", "info", "warn", "error", "fatal"]);
  if (!allowed.has(value)) {
    return "info";
  }
  return value;
}
