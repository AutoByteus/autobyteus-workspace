import { BaseLLMResponseProcessor, type AgentContext } from "autobyteus-ts";
import type { LLMCompleteResponseReceivedEvent } from "autobyteus-ts/agent/events/agent-events.js";
import type { CompleteResponse } from "autobyteus-ts/llm/utils/response-types.js";
import { TokenUsageStore } from "../../../token-usage/providers/token-usage-store.js";
import { resolveAgentRunIdFromRuntimeContext } from "../../utils/core-boundary-id-normalizer.js";

const logger = {
  debug: (...args: unknown[]) => console.debug(...args),
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export class TokenUsagePersistenceProcessor extends BaseLLMResponseProcessor {
  private tokenUsageStore: TokenUsageStore;

  constructor() {
    super();
    this.tokenUsageStore = new TokenUsageStore();
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
    const runId = resolveAgentRunIdFromRuntimeContext(context);

    if (!response.usage) {
      logger.warn(
        `Run '${runId}': No token usage data in response. Skipping persistence.`,
      );
      return false;
    }

    const usage = response.usage;
    const llmModel = context.llmInstance?.model.value ?? null;

    try {
      logger.debug(
        `Run '${runId}': Creating detailed token usage records for run '${runId}'.`,
      );

      await this.tokenUsageStore.createConversationTokenUsageRecords(
        runId,
        usage,
        llmModel,
      );

      logger.info(
        `Run '${runId}': Successfully created detailed token usage records.`,
      );
    } catch (error) {
      logger.error(
        `Run '${runId}': Failed to persist token usage for run '${runId}': ${String(
          error,
        )}`,
      );
    }

    return false;
  }
}
