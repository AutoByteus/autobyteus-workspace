import {
  BaseAgentUserInputMessageProcessor,
  type AgentContext,
  type AgentInputUserMessage,
} from "autobyteus-ts";
import type { UserMessageReceivedEvent } from "autobyteus-ts/agent/events/agent-events.js";
import { SqlChannelMessageReceiptProvider } from "../../../external-channel/providers/sql-channel-message-receipt-provider.js";
import { ChannelMessageReceiptService } from "../../../external-channel/services/channel-message-receipt-service.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export class ExternalChannelTurnReceiptBindingProcessor extends BaseAgentUserInputMessageProcessor {
  private readonly messageReceiptService: ChannelMessageReceiptService;

  constructor() {
    super();
    this.messageReceiptService = new ChannelMessageReceiptService(
      new SqlChannelMessageReceiptProvider(),
    );
  }

  static override getName(): string {
    return "ExternalChannelTurnReceiptBindingProcessor";
  }

  static override getOrder(): number {
    return 925;
  }

  static override isMandatory(): boolean {
    return true;
  }

  async process(
    message: AgentInputUserMessage,
    context: AgentContext,
    _triggeringEvent: UserMessageReceivedEvent,
  ): Promise<AgentInputUserMessage> {
    const runId = context.agentId;
    const externalSource = message.getExternalSourceMetadata();
    if (!externalSource) {
      return message;
    }

    const turnId = normalizeOptionalString(context.state.activeTurnId ?? null);
    if (!turnId) {
      logger.warn(
        `Agent run '${runId}': skipping external turn binding because activeTurnId is missing.`,
      );
      return message;
    }

    try {
      await this.messageReceiptService.bindTurnToReceipt({
        provider: externalSource.provider,
        transport: externalSource.transport,
        accountId: externalSource.accountId,
        peerId: externalSource.peerId,
        threadId: externalSource.threadId,
        externalMessageId: externalSource.externalMessageId,
        turnId,
        agentRunId: runId,
        teamRunId: null,
        receivedAt: normalizeDateOrNow(externalSource.receivedAt),
      });
    } catch (error) {
      logger.error(
        `Agent run '${runId}': failed to bind external turn receipt: ${String(error)}`,
      );
    }

    return message;
  }
}

const normalizeOptionalString = (value: string | null): string | null => {
  if (value === null) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeDateOrNow = (value: string): Date => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
};
