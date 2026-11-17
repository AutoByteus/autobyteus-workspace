import type { TokenUsageRunSummaryPayload } from "../../agent-execution/domain/agent-run-token-usage.js";
import type { TokenUsageRunStore } from "../providers/token-usage-run-store.js";

/** The agent runs delegated from a standalone run, recursively (the Task entries; each run's agents from its own file). */
export type StandaloneRunTreeAgentRunIds = Readonly<{
  listChildAgentRunIds(agentRunId: string): Promise<readonly string[]>;
}>;

/**
 * A standalone run's token usage including the runs delegated from it (recursively), as a Team run's usage includes its
 * members. It needs no attribution data beyond the Task entries, so it covers existing runs too; a run that delegated
 * nothing is its own agent alone.
 */
export class StandaloneRunTokenUsageSummaryService {
  constructor(private readonly deps: Readonly<{
    tree: StandaloneRunTreeAgentRunIds;
    store: Pick<TokenUsageRunStore, "getStandaloneRunSummary">;
  }>) {}

  async getSummary(runId: string): Promise<TokenUsageRunSummaryPayload> {
    const agentRunId = runId.trim();
    if (!agentRunId) throw new Error("runId is required.");
    const children = new Set(await this.deps.tree.listChildAgentRunIds(agentRunId));
    children.delete(agentRunId);
    return this.deps.store.getStandaloneRunSummary({ agentRunId, childAgentRunIds: [...children] });
  }
}
