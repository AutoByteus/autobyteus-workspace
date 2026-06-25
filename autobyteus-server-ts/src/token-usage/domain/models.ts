import type { TokenUsageApiCostStatus } from "../../agent-execution/domain/agent-run-token-usage.js";

export class TokenUsageStats {
  promptTokens: number;
  assistantTokens: number;
  reasoningTokens: number;
  promptTokenCost: number | null;
  assistantTokenCost: number | null;
  reasoningTokenCost: number | null;
  totalCost: number | null;
  currency: string | null;
  apiCostStatus: TokenUsageApiCostStatus;
  eventCount: number;

  constructor(options?: {
    promptTokens?: number;
    assistantTokens?: number;
    reasoningTokens?: number;
    promptTokenCost?: number | null;
    assistantTokenCost?: number | null;
    reasoningTokenCost?: number | null;
    totalCost?: number | null;
    currency?: string | null;
    apiCostStatus?: TokenUsageApiCostStatus;
    eventCount?: number;
  }) {
    this.promptTokens = options?.promptTokens ?? 0;
    this.assistantTokens = options?.assistantTokens ?? 0;
    this.reasoningTokens = options?.reasoningTokens ?? 0;
    this.promptTokenCost = options?.promptTokenCost ?? null;
    this.assistantTokenCost = options?.assistantTokenCost ?? null;
    this.reasoningTokenCost = options?.reasoningTokenCost ?? null;
    this.totalCost = options?.totalCost ?? null;
    this.currency = options?.currency ?? null;
    this.apiCostStatus = options?.apiCostStatus ?? "price_missing";
    this.eventCount = options?.eventCount ?? 0;
  }
}
