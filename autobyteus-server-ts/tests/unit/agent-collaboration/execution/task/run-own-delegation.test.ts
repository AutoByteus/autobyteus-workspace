import { describe, expect, it, vi } from "vitest";
import { RunOwnDelegations } from "../../../../../src/agent-collaboration/execution/task/run-own-delegation.js";
import type { RunOwnDelegationRecord } from "../../../../../src/run-history/store/run-own-agents-reader.js";

/** autobyteus-461 SR-072 F-24 (contract §3, model U11): a run no Task names keeps its delegation in its own file. */
const M = { rootSubjectKind: "agent" as const, rootRunId: "manager" };
const delegatedFrom = { delegatingRun: M, delegatorAgentRunId: "manager" };
const harness = (record: RunOwnDelegationRecord | null, catalogAddress: string | null = "/review_team") => {
  const port = { isApplicationBound: false } as never;
  const portOf = vi.fn(async () => port);
  const catalogAddressOf = vi.fn(async () => catalogAddress);
  const owner = new RunOwnDelegations({ files: { delegationOf: async () => record }, portOf, admission: () => ({ catalogAddressOf }) });
  return { owner, portOf, catalogAddressOf, port };
};

describe("RunOwnDelegations (SR-072 F-24)", () => {
  it("an agent run: its own file's delegation and stored address; the catalog is not asked", async () => {
    const h = harness({ delegatedFrom, address: "/image_maker", definition: { kind: "agent", definitionId: "image-maker" }, entryAgentRunId: "image" });
    await expect(h.owner.of({ agentRunId: "image" })).resolves.toEqual({ delegatedFrom, recipientAddress: "/image_maker", entryAgentRunId: "image" });
    expect(h.portOf).not.toHaveBeenCalled();
  });

  it("a team run keeps no address: its definition's address in its delegator's catalog, as its delegator sees it", async () => {
    const definition = { kind: "agent_team" as const, definitionId: "review-team" };
    const h = harness({ delegatedFrom, address: null, definition, entryAgentRunId: "lead" });
    await expect(h.owner.of({ teamRunId: "review" })).resolves.toEqual({ delegatedFrom, recipientAddress: "/review_team", entryAgentRunId: "lead" });
    expect(h.portOf).toHaveBeenCalledWith(M, "manager");
    expect(h.catalogAddressOf).toHaveBeenCalledWith(h.port, definition);
  });

  it("none for a run with no local delegator, or a team whose definition its delegator's catalog no longer offers", async () => {
    await expect(harness(null).owner.of({ agentRunId: "own" })).resolves.toBeNull();
    const h = harness({ delegatedFrom, address: null, definition: { kind: "agent_team", definitionId: "gone" }, entryAgentRunId: "lead" }, null);
    await expect(h.owner.of({ teamRunId: "review" })).resolves.toBeNull();
  });
});
