import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { StandaloneRunTokenUsageSummaryService } from "../../../../src/token-usage/services/standalone-run-token-usage-summary-service.js";

/**
 * REQ-006 (kept by autobyteus-461 REQ-009): a standalone run's usage includes the runs delegated from it; their agent
 * run IDs come from the Task entries and each run's own file (`DelegatedRunAgentsReader`, tested on its own).
 */
const HOST = "research_assistant_host";
const serviceOver = (children: readonly string[]) => {
  const store = { getStandaloneRunSummary: vi.fn(async (input: { agentRunId: string }) => ({ run_id: input.agentRunId }) as never) };
  const service = new StandaloneRunTokenUsageSummaryService({ tree: { listChildAgentRunIds: async () => [...children] }, store });
  return { service, store };
};

describe("StandaloneRunTokenUsageSummaryService (REQ-006)", () => {
  it("rolls up the run's own agent and the agents of the runs delegated from it", async () => {
    const { service, store } = serviceOver(["reviewer-run", "lead-run", "designer-run"]);
    await expect(service.getSummary(` ${HOST} `)).resolves.toEqual({ run_id: HOST });
    expect(store.getStandaloneRunSummary).toHaveBeenCalledWith(expect.objectContaining({ agentRunId: HOST }));
    expect([...(store.getStandaloneRunSummary.mock.calls[0]![0] as unknown as { childAgentRunIds: string[] }).childAgentRunIds].sort())
      .toEqual(["designer-run", "lead-run", "reviewer-run"]);
  });

  it("is the run alone when it delegated nothing", async () => {
    const { service, store } = serviceOver([]);
    await service.getSummary(HOST);
    expect(store.getStandaloneRunSummary).toHaveBeenCalledWith({ agentRunId: HOST, childAgentRunIds: [] });
  });
});
