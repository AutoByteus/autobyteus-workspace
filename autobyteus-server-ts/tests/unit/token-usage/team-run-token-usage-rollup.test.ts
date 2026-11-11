import "reflect-metadata";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { bindDelegatedRuns, unbindDelegatedRuns } from "../../../src/run-history/services/delegated-run-agents-reader.js";
import { TokenUsageRunStore } from "../../../src/token-usage/providers/token-usage-run-store.js";
import { TokenUsageStatisticsResolver } from "../../../src/api/graphql/types/token-usage-stats.js";

/** autobyteus-461 CR-461-004 (REQ-009): a team or org run's token total includes every run delegated from it. */
const roots: string[] = [];
afterEach(() => { vi.restoreAllMocks(); for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });

describe("getTeamRunTokenUsageSummary", () => {
  it.each(["agent_team", "agent_org"] as const)("rolls a %s run up over the runs delegated from it, recursively", async (kind) => {
    const memoryDir = fs.mkdtempSync(path.join(os.tmpdir(), "team-token-rollup-")); roots.push(memoryDir);
    vi.spyOn(appConfigProvider, "config", "get").mockReturnValue({ getMemoryDir: () => memoryDir } as never);
    const subtree = { "agent_team": [{ agentRunId: "writer" }, { agentRunId: "helper" }], "agent_org": [{ agentRunId: "analyst" }] };
    const port = {
      childrenOf: () => [],
      subtreeOf: (run: { rootSubjectKind: string }) => run.rootSubjectKind === kind ? subtree[kind] : [],
    };
    bindDelegatedRuns(port as never);
    const summary = vi.spyOn(TokenUsageRunStore.prototype, "getTeamRunSummary").mockResolvedValue({ run_id: "root" } as never);
    try {
      await new TokenUsageStatisticsResolver().getTeamRunTokenUsageSummary("root").catch(() => undefined);
      expect(summary).toHaveBeenCalledWith("root", subtree[kind].map((run) => run.agentRunId));
    } finally {
      unbindDelegatedRuns(port as never);
    }
  });
});
