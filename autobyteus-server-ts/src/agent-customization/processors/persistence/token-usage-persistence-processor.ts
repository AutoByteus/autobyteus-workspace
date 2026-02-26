import { BaseLLMResponseProcessor, type AgentContext } from "autobyteus-ts";
import type { LLMCompleteResponseReceivedEvent } from "autobyteus-ts/agent/events/agent-events.js";
import type { CompleteResponse } from "autobyteus-ts/llm/utils/response-types.js";
import { PersistenceProxy as TokenUsagePersistenceProxy } from "../../../token-usage/providers/persistence-proxy.js";

const logger = {
  debug: (...args: unknown[]) => console.debug(...args),
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export class TokenUsagePersistenceProcessor extends BaseLLMResponseProcessor {
  private tokenUsageProxy: TokenUsagePersistenceProxy;

  constructor() {
    super();
    this.tokenUsageProxy = new TokenUsagePersistenceProxy();
    logger.debug("TokenUsagePersistenceProcessor initialized.");
  }

  static override getName(): string {
    return "TokenUsagePersistenceProcessor";
  }

  static override getOrder(): number {
    return 900;
  }

  static override isMandatory(): boolean {
    return false;
  }

  async processResponse(
    response: CompleteResponse,
    context: AgentContext,
    _triggeringEvent: LLMCompleteResponseReceivedEvent,
  ): Promise<boolean> {
    const agentId = context.agentId;

    if (!response.usage) {
      logger.warn(
        `Agent '${agentId}': No token usage data in response. Skipping persistence.`,
      );
      return false;
    }

    const usage = response.usage;
    const llmModel = context.llmInstance?.model.value ?? null;

    try {
      logger.debug(
        `Agent '${agentId}': Creating detailed token usage records for conversation of agent '${agentId}'.`,
      );

      await this.tokenUsageProxy.createConversationTokenUsageRecords(
        agentId,
        usage,
        llmModel,
      );

      logger.info(
        `Agent '${agentId}': Successfully created detailed token usage records.`,
      );
    } catch (error) {
      logger.error(
        `Agent '${agentId}': Failed to persist token usage for agent '${agentId}': ${String(
          error,
        )}`,
      );
    }

    return false;
  }
}
