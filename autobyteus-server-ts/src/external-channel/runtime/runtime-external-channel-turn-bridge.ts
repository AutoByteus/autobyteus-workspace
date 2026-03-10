import type { RuntimeKind } from "../../runtime-management/runtime-kind.js";
import { DEFAULT_RUNTIME_KIND } from "../../runtime-management/runtime-kind.js";
import {
  getRuntimeAdapterRegistry,
  type RuntimeAdapterRegistry,
} from "../../runtime-execution/runtime-adapter-registry.js";
import { normalizeMethodRuntimeMethod } from "../../runtime-execution/method-runtime/runtime-method-normalizer.js";
import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import { getProviderProxySet } from "../providers/provider-proxy-set.js";
import { buildDefaultReplyCallbackService } from "./gateway-callback-delivery-runtime.js";
import { ChannelMessageReceiptService } from "../services/channel-message-receipt-service.js";
import {
  ReplyCallbackService,
  type PublishAssistantReplyByTurnResult,
} from "../services/reply-callback-service.js";
import {
  getRunProjectionService,
  type RunProjectionService,
} from "../../run-history/services/run-projection-service.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

const PENDING_TURN_TTL_MS = 10 * 60 * 1000;

export type AcceptedExternalTurnInput = {
  runId: string;
  runtimeKind: RuntimeKind;
  turnId: string | null;
  envelope: ExternalMessageEnvelope;
};

type MessageReceiptBinder = Pick<ChannelMessageReceiptService, "bindTurnToReceipt">;
type ReplyCallbackPort = Pick<ReplyCallbackService, "publishAssistantReplyByTurn">;
type ReplyCallbackFactory = () => ReplyCallbackPort;
type AdapterRegistryPort = Pick<RuntimeAdapterRegistry, "resolveAdapter">;
type RunProjectionPort = Pick<RunProjectionService, "getProjection">;

export type RuntimeExternalChannelTurnBridgeDependencies = {
  messageReceiptService?: MessageReceiptBinder;
  replyCallbackService?: ReplyCallbackPort;
  replyCallbackServiceFactory?: ReplyCallbackFactory;
  adapterRegistry?: AdapterRegistryPort;
  runProjectionService?: RunProjectionPort;
};

type PendingTurn = {
  key: string;
  runId: string;
  runtimeKind: RuntimeKind;
  turnId: string;
  envelope: ExternalMessageEnvelope;
  assistantText: string;
  finalText: string | null;
  settled: boolean;
  unsubscribe: (() => void) | null;
  timeout: ReturnType<typeof setTimeout>;
};

export class RuntimeExternalChannelTurnBridge {
  private readonly pendingTurns = new Map<string, PendingTurn>();

  private readonly messageReceiptService: MessageReceiptBinder;

  private readonly replyCallbackServiceFactory: ReplyCallbackFactory;

  private readonly adapterRegistry: AdapterRegistryPort;

  private readonly runProjectionService: RunProjectionPort;

  constructor(deps: RuntimeExternalChannelTurnBridgeDependencies = {}) {
    const providerSet = getProviderProxySet();
    this.messageReceiptService =
      deps.messageReceiptService ??
      new ChannelMessageReceiptService(providerSet.messageReceiptProvider);
    this.replyCallbackServiceFactory =
      deps.replyCallbackServiceFactory ??
      (() => deps.replyCallbackService ?? createReplyCallbackService());
    this.adapterRegistry =
      deps.adapterRegistry ?? getRuntimeAdapterRegistry();
    this.runProjectionService =
      deps.runProjectionService ?? getRunProjectionService();
  }

  async bindAcceptedExternalTurn(input: AcceptedExternalTurnInput): Promise<void> {
    const turnId = normalizeOptionalString(input.turnId);
    if (!turnId) {
      logger.info(
        `Run '${input.runId}': skipping runtime-external turn bridge because accepted turnId is missing.`,
      );
      return;
    }

    await this.messageReceiptService.bindTurnToReceipt({
      provider: input.envelope.provider,
      transport: input.envelope.transport,
      accountId: input.envelope.accountId,
      peerId: input.envelope.peerId,
      threadId: input.envelope.threadId,
      externalMessageId: input.envelope.externalMessageId,
      turnId,
      agentRunId: input.runId,
      teamRunId: null,
      receivedAt: normalizeDateOrNow(input.envelope.receivedAt),
    });

    if (input.runtimeKind === DEFAULT_RUNTIME_KIND) {
      return;
    }

    const adapter = this.adapterRegistry.resolveAdapter(input.runtimeKind);
    if (!adapter.subscribeToRunEvents) {
      logger.warn(
        `Run '${input.runId}': runtime '${input.runtimeKind}' does not support event subscriptions for external reply routing.`,
      );
      return;
    }

    const key = buildPendingTurnKey(input.runId, turnId);
    if (this.pendingTurns.has(key)) {
      return;
    }

    const timeout = setTimeout(() => {
      this.finishPendingTurn(key);
    }, PENDING_TURN_TTL_MS);
    if (typeof (timeout as { unref?: () => void }).unref === "function") {
      (timeout as { unref: () => void }).unref();
    }

    const pending: PendingTurn = {
      key,
      runId: input.runId,
      runtimeKind: input.runtimeKind,
      turnId,
      envelope: input.envelope,
      assistantText: "",
      finalText: null,
      settled: false,
      unsubscribe: null,
      timeout,
    };

    pending.unsubscribe = adapter.subscribeToRunEvents(input.runId, (event: unknown) => {
      void this.handleRuntimeEvent(pending, event);
    });
    this.pendingTurns.set(key, pending);
  }

  private async handleRuntimeEvent(
    pending: PendingTurn,
    event: unknown,
  ): Promise<void> {
    if (pending.settled) {
      return;
    }

    const parsed = parseRuntimeEvent(event);
    if (!parsed) {
      return;
    }

    if (!this.matchesPendingTurn(pending, parsed.turnId)) {
      return;
    }

    if (parsed.method === "item/outputText/delta" && parsed.text) {
      pending.assistantText = mergeAssistantText(pending.assistantText, parsed.text);
      return;
    }

    if (
      (parsed.method === "item/outputText/completed" || parsed.method === "item/completed") &&
      parsed.text
    ) {
      pending.finalText = mergeAssistantText(pending.finalText ?? "", parsed.text);
      return;
    }

    if (parsed.method === "error") {
      this.finishPendingTurn(pending.key);
      return;
    }

    if (parsed.method === "turn/completed") {
      await this.publishPendingTurnReply(pending);
    }
  }

  private matchesPendingTurn(
    pending: PendingTurn,
    eventTurnId: string | null,
  ): boolean {
    if (eventTurnId) {
      return eventTurnId === pending.turnId;
    }
    return this.countPendingTurnsForRun(pending.runId) === 1;
  }

  private countPendingTurnsForRun(runId: string): number {
    let count = 0;
    for (const pending of this.pendingTurns.values()) {
      if (pending.runId === runId) {
        count += 1;
      }
    }
    return count;
  }

  private async publishPendingTurnReply(pending: PendingTurn): Promise<void> {
    if (pending.settled) {
      return;
    }
    pending.settled = true;

    try {
      let replyText =
        normalizeOptionalString(pending.finalText) ??
        normalizeOptionalString(pending.assistantText);
      if (!replyText) {
        replyText = await this.resolveReplyTextFromProjection(pending.runId);
      }
      if (!replyText) {
        logger.info(
          `Run '${pending.runId}': skipping provider callback because assistant output could not be resolved for turn '${pending.turnId}'.`,
        );
        return;
      }

      const result = await this.replyCallbackServiceFactory().publishAssistantReplyByTurn({
        agentRunId: pending.runId,
        turnId: pending.turnId,
        replyText,
        callbackIdempotencyKey: buildCallbackIdempotencyKey(
          pending.runId,
          pending.turnId,
        ),
      });
      this.logSkippedPublish(pending.runId, result);
    } catch (error) {
      logger.error(
        `Run '${pending.runId}': runtime-native provider callback publish failed: ${String(error)}`,
      );
    } finally {
      this.finishPendingTurn(pending.key);
    }
  }

  private async resolveReplyTextFromProjection(runId: string): Promise<string | null> {
    const projection = await this.runProjectionService.getProjection(runId);
    for (let index = projection.conversation.length - 1; index >= 0; index -= 1) {
      const entry = projection.conversation[index];
      if (entry?.kind !== "message" || entry.role !== "assistant") {
        continue;
      }
      const content = normalizeOptionalString(entry.content);
      if (!content) {
        continue;
      }
      const withoutReasoning = stripReasoningSection(content);
      return normalizeOptionalString(withoutReasoning) ?? content;
    }
    return null;
  }

  private finishPendingTurn(key: string): void {
    const pending = this.pendingTurns.get(key);
    if (!pending) {
      return;
    }
    this.pendingTurns.delete(key);
    clearTimeout(pending.timeout);
    if (pending.unsubscribe) {
      try {
        pending.unsubscribe();
      } catch {
        // ignore cleanup failures
      }
    }
  }

  private logSkippedPublish(
    runId: string,
    result: PublishAssistantReplyByTurnResult,
  ): void {
    if (result.published || !result.reason || result.reason === "SOURCE_NOT_FOUND") {
      return;
    }
    logger.info(
      `Run '${runId}': runtime-native outbound callback skipped (${result.reason}).`,
    );
  }
}

const buildPendingTurnKey = (runId: string, turnId: string): string =>
  `${runId}:${turnId}`;

const buildCallbackIdempotencyKey = (runId: string, turnId: string): string =>
  `external-reply:${runId}:${turnId}`;

const createReplyCallbackService = (): ReplyCallbackService => {
  return buildDefaultReplyCallbackService();
};

const parseRuntimeEvent = (
  event: unknown,
): { method: string; turnId: string | null; text: string | null } | null => {
  const payload = asObject(event);
  if (!payload) {
    return null;
  }

  const rawMethod = asNonEmptyString(payload.method);
  if (!rawMethod) {
    return null;
  }

  const method = normalizeMethodRuntimeMethod(rawMethod);
  const params = asObject(payload.params) ?? asObject(payload.payload) ?? {};
  return {
    method,
    turnId: resolveTurnId(method, params),
    text: resolveAssistantText(method, params),
  };
};

const resolveTurnId = (
  method: string,
  params: Record<string, unknown>,
): string | null => {
  const turn = asObject(params.turn);
  const item = asObject(params.item);
  const rawTurnId =
    asNonEmptyString(params.turnId) ??
    asNonEmptyString(params.turn_id) ??
    asNonEmptyString(turn?.id) ??
    asNonEmptyString(item?.turnId) ??
    asNonEmptyString(item?.turn_id);
  if (rawTurnId) {
    return rawTurnId;
  }
  if (method.startsWith("item/outputText/")) {
    return asNonEmptyString(params.id);
  }
  return null;
};

const resolveAssistantText = (
  method: string,
  params: Record<string, unknown>,
): string | null => {
  if (method === "item/outputText/delta") {
    return normalizeOptionalRawString(
      asNonEmptyRawString(params.delta) ?? asNonEmptyRawString(params.text),
    );
  }

  if (method === "item/outputText/completed") {
    return normalizeOptionalRawString(
      asNonEmptyRawString(params.text) ??
        asNonEmptyRawString(params.delta) ??
        extractAssistantText(params),
    );
  }

  if (method === "item/completed") {
    return extractAssistantText(params);
  }

  return null;
};

const extractAssistantText = (
  params: Record<string, unknown>,
): string | null => {
  const item = asObject(params.item) ?? params;
  const kind = normalizeItemKind(item);
  if (
    !kind.includes("outputtext") &&
    !kind.includes("assistant") &&
    !kind.includes("agentmessage")
  ) {
    return null;
  }

  const fragments = [
    asNonEmptyRawString(item.text),
    asNonEmptyRawString(item.delta),
    asNonEmptyRawString(item.value),
    ...collectTextFragments(item.content),
  ].filter((value): value is string => Boolean(value));

  if (fragments.length === 0) {
    return null;
  }

  return normalizeOptionalRawString(fragments.join("\n"));
};

const normalizeItemKind = (value: Record<string, unknown>): string =>
  (
    asNonEmptyString(value.type) ??
    asNonEmptyString(value.method) ??
    asNonEmptyString(value.kind) ??
    ""
  )
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const collectTextFragments = (value: unknown, depth = 0): string[] => {
  if (depth > 4 || value === null || value === undefined) {
    return [];
  }
  if (typeof value === "string") {
    return value.trim() ? [value] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectTextFragments(entry, depth + 1));
  }
  const objectValue = asObject(value);
  if (!objectValue) {
    return [];
  }
  return [
    objectValue.text,
    objectValue.content,
    objectValue.value,
    objectValue.delta,
    objectValue.summary,
  ].flatMap((entry) => collectTextFragments(entry, depth + 1));
};

const mergeAssistantText = (current: string, incoming: string): string => {
  const normalizedIncoming = normalizeOptionalRawString(incoming);
  if (!normalizedIncoming) {
    return current;
  }
  if (!current) {
    return normalizedIncoming;
  }
  if (normalizedIncoming === current) {
    return current;
  }
  if (normalizedIncoming.startsWith(current)) {
    return normalizedIncoming;
  }
  if (current.startsWith(normalizedIncoming)) {
    return current;
  }
  return `${current}${normalizedIncoming}`;
};

const stripReasoningSection = (content: string): string => {
  const marker = "\n\n[reasoning]\n";
  const index = content.indexOf(marker);
  if (index < 0) {
    return content;
  }
  return content.slice(0, index).trim();
};

const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const asNonEmptyRawString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeOptionalRawString = (value: string | null | undefined): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  return value.trim().length > 0 ? value : null;
};

const normalizeDateOrNow = (value: string): Date => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
};

let cachedRuntimeExternalChannelTurnBridge: RuntimeExternalChannelTurnBridge | null = null;

export const getRuntimeExternalChannelTurnBridge = (): RuntimeExternalChannelTurnBridge => {
  if (!cachedRuntimeExternalChannelTurnBridge) {
    cachedRuntimeExternalChannelTurnBridge = new RuntimeExternalChannelTurnBridge();
  }
  return cachedRuntimeExternalChannelTurnBridge;
};
