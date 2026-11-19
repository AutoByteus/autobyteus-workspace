import { describe, expect, it, vi } from "vitest";
import { StandaloneRunAgentContextBuilder } from "../../../src/standalone-agent-run-root/services/standalone-run-agent-context-builder.js";
import { resolveRuntimeAgentToolExposure } from "../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { createAgentTeamAddress } from "../../../src/agent-collaboration/domain/agent-team-address.js";

/**
 * autobyteus-461 CR-461-114 (F-90, REQ-009): a delegated agent run's own agent gets `get_handoff_rules` where base's hosted
 * copy did (its tree starts at a Team or an Org run), with its own rules: an Org placement's handoffs, else none.
 */
const builder = (collaboration: Record<string, unknown>) => new StandaloneRunAgentContextBuilder({
  definitions: { getAgentDefinitionById: vi.fn(async () => null) } as never,
  tree: { collaborationTreeOf: () => ({ agentCollaboration: async () => collaboration }) } as never,
  orgInstruction: async () => null,
  getActiveRoot: () => null,
  readStoredAgentAddress: async () => createAgentTeamAddress(["writer"]),
});
const metadata = { runId: "copy", agentDefinitionId: "writer-def" } as never;
const handoff = { from: "/writer", to: "/manager", rules: ["When the notes are written."] };

describe("StandaloneRunAgentContextBuilder: get_handoff_rules (CR-461-114)", () => {
  it("a copy in a tree that starts at a Team or Org run has the tool, with its own rules (none for a catalog copy)", async () => {
    const catalog = await builder({ role: "task_agent", placement: null, teamScoped: true }).build(metadata);
    expect(resolveRuntimeAgentToolExposure(null, catalog).getHandoffRulesEnabled).toBe(true);
    expect(catalog.collaboration.outgoingHandoffs).toEqual([]);
    const placed = await builder({ role: "task_agent", placement: { handoffs: [handoff], orgDefinitionId: "org-def" }, teamScoped: true }).build(metadata);
    expect(resolveRuntimeAgentToolExposure(null, placed).getHandoffRulesEnabled).toBe(true);
    expect(placed.collaboration.outgoingHandoffs).toEqual([handoff]);
  });

  it("a copy whose tree starts at an Agent run, and a run the user started, do not", async () => {
    const underAgent = await builder({ role: "task_agent", placement: null, teamScoped: false }).build(metadata);
    expect(resolveRuntimeAgentToolExposure(null, underAgent).getHandoffRulesEnabled).toBe(false);
    expect(resolveRuntimeAgentToolExposure(null, underAgent).sendMessageToEnabled).toBe(true);
    const mine = await builder({ role: "standalone_agent", placement: null, teamScoped: false }).build(metadata);
    expect(resolveRuntimeAgentToolExposure(null, mine).getHandoffRulesEnabled).toBe(false);
  });
});
