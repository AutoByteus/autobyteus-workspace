import { describe, expect, it, vi } from "vitest";
import { createRunConversationAvailability } from "../../../../../src/agent-collaboration/execution/task/run-conversation-availability.js";

/**
 * autobyteus-461 CR-461-043: whether an existing delegated run can take a follow-up Task, as base checked a shut-down
 * copy: a run whose entry agent is live can; otherwise its entry agent's saved conversation is inspected (an agent run's
 * own folder; a team run's coordinator, from the team's saved tree). Read-only.
 */
const harness = (live: readonly string[] = []) => {
  const inspect = vi.fn((_input: { agentRunId: string; memoryDir: string }) => ({ kind: "none" as const }));
  const findAgent = vi.fn(async () => ({ memberAddress: "/lead", memoryDir: "/m/agent_teams/eng/lead" }));
  const availability = createRunConversationAvailability({ memoryDir: "/m", inspector: { inspect },
    liveAgents: () => ({ runAgentStatuses: () => live.map((agentRunId) => ({ agentRunId, status: "running" })) as never }),
    teamMembers: { findAgent: findAgent as never } });
  return { availability, inspect, findAgent };
};

describe("createRunConversationAvailability", () => {
  it("a run whose entry agent is live can continue; nothing is read", async () => {
    const h = harness(["reviewer"]);
    await expect(h.availability({ agentRunId: "reviewer" }, { agentRunId: "reviewer", address: "/code_reviewer" }))
      .resolves.toEqual({ entryAddress: "/code_reviewer", activity: { kind: "present" } });
    expect(h.inspect).not.toHaveBeenCalled();
  });

  it("a stopped agent run's own saved conversation is inspected", async () => {
    const h = harness();
    await expect(h.availability({ agentRunId: "reviewer" }, { agentRunId: "reviewer", address: "/code_reviewer" }))
      .resolves.toEqual({ entryAddress: "/code_reviewer", activity: { kind: "none" } });
    expect(h.inspect).toHaveBeenCalledWith({ agentRunId: "reviewer", memoryDir: expect.stringContaining("reviewer") });
  });

  it("a stopped team run's coordinator is found in the team's saved tree and its conversation inspected", async () => {
    const h = harness();
    await expect(h.availability({ teamRunId: "eng" }, { agentRunId: "eng-lead", address: "/eng" }))
      .resolves.toEqual({ entryAddress: "/lead", activity: { kind: "none" } });
    expect(h.findAgent).toHaveBeenCalledWith({ rootTeamRunId: "eng", agentRunId: "eng-lead" });
    expect(h.inspect).toHaveBeenCalledWith({ agentRunId: "eng-lead", memoryDir: "/m/agent_teams/eng/lead" });
  });
});
