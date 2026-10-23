import { describe, expect, it, vi } from "vitest";
import { AgentOrgExecutionIndex } from "../../../src/agent-org-execution/services/agent-org-execution-index.js";
import type { HistoryCandidatePlan } from "../../../src/app-data-migrations/migrations/agent-org-flat-team-families-v1/agent-org-history-candidate-plan.js";
import {
  AgentOrgTokenAttributionDataRejection,
  type OrgTokenAttributionRepository,
} from "../../../src/app-data-migrations/migrations/agent-org-flat-team-families-v1/agent-org-token-attribution-repository.js";
import { AgentOrgTokenAttributionTransition } from "../../../src/app-data-migrations/migrations/agent-org-flat-team-families-v1/agent-org-token-attribution-transition.js";
import { testAgentOrgExecutionTree, testOrgAgentNode } from "../../fixtures/current-agent-org-run-fixtures.js";

const plan = (id = "org"): HistoryCandidatePlan => ({
  kind: "index-only",
  id,
  source: `/unused/${id}`,
  index: new AgentOrgExecutionIndex(testAgentOrgExecutionTree({
    orgRunId: id,
    members: [testOrgAgentNode("/member", `${id}-member`)],
  })),
});

const repository = (input: {
  claimedRoots?: readonly string[];
  convert?: (id: string) => Promise<number>;
  discoveryFailure?: Error;
} = {}): OrgTokenAttributionRepository => ({
  async *listClaimedRoots() {
    if (input.discoveryFailure) throw input.discoveryFailure;
    for (const id of input.claimedRoots ?? []) yield id;
  },
  convertRoot: vi.fn(input.convert ?? (async () => 0)),
});

describe("AgentOrgTokenAttributionTransition result classification", () => {
  it("routes only typed repository data rejection to warnings", async () => {
    const transition = new AgentOrgTokenAttributionTransition("/unused", repository({
      convert: async () => { throw new AgentOrgTokenAttributionDataRejection("rejected legacy tuple"); },
    }));

    const result = await transition.execute([plan()], new Map());

    expect(result.warnings).toEqual(new Map([["org", "AgentOrgTokenAttributionDataRejection: rejected legacy tuple"]]));
    expect(result.failures).toEqual(new Map());
    expect(result.changed).toEqual(new Map());
  });

  it("routes untyped per-root failures to failures", async () => {
    const transition = new AgentOrgTokenAttributionTransition("/unused", repository({
      convert: async () => { throw new Error("database interrupted"); },
    }));

    const result = await transition.execute([plan()], new Map());

    expect(result.warnings).toEqual(new Map());
    expect(result.failures).toEqual(new Map([["org", "Error: database interrupted"]]));
    expect(result.changed).toEqual(new Map());
  });

  it("keeps root identity validation fatal", async () => {
    const convert = vi.fn(async () => 0);
    const transition = new AgentOrgTokenAttributionTransition("/unused", repository({ claimedRoots: ["../unsafe"], convert }));

    const result = await transition.execute([], new Map());

    expect(result.warnings).toEqual(new Map());
    expect(result.failures.get("../unsafe")).toContain("Unsafe root identity");
    expect(convert).not.toHaveBeenCalled();
  });

  it("keeps global token-root discovery attempt-fatal", async () => {
    const transition = new AgentOrgTokenAttributionTransition("/unused", repository({
      discoveryFailure: new Error("database unavailable"),
    }));

    await expect(transition.execute([plan()], new Map())).rejects.toThrow("Token source discovery failed: Error: database unavailable");
  });
});
