import type { TokenUsageRunSummaryPayload } from "../../agent-execution/domain/agent-run-token-usage.js";
import type { TokenUsageRunStore } from "../providers/token-usage-run-store.js";

/** The agent runs a standalone run's collaboration tree holds: the live root's tree, else the stored package. */
export type StandaloneRunTreeAgentRunIds = Readonly<{
  listChildAgentRunIds(hostRunId: string): Promise<readonly string[]>;
}>;

/**
 * A standalone run's token usage including its collaborators, the members of its collaborator
 * Teams and its task copies (recursively), as a Team run's usage includes its members. It needs
 * no attribution data beyond the run's collaboration tree, so it covers existing runs too; a run
 * without a package is its host alone.
 */
export class StandaloneRunTokenUsageSummaryService {
  constructor(private readonly deps: Readonly<{
    tree: StandaloneRunTreeAgentRunIds;
    store: Pick<TokenUsageRunStore, "getStandaloneRunSummary">;
  }>) {}

  async getSummary(runId: string): Promise<TokenUsageRunSummaryPayload> {
    const hostRunId = runId.trim();
    if (!hostRunId) throw new Error("runId is required.");
    const children = new Set(await this.deps.tree.listChildAgentRunIds(hostRunId));
    children.delete(hostRunId);
    return this.deps.store.getStandaloneRunSummary({ hostRunId, childAgentRunIds: [...children] });
  }
}
