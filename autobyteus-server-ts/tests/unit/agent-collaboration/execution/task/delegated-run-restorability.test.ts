import { describe, expect, it, vi } from "vitest";
import { DelegatedRunRestorability } from "../../../../../src/agent-collaboration/execution/task/delegated-run-restorability.js";
import type { AgentConversationActivity } from "../../../../../src/agent-memory/services/agent-conversation-activity-inspector.js";

/**
 * autobyteus-461 CR-461-070 (F-50): input that would restore a delegated run whose entry agent's saved conversation cannot
 * continue is refused with base's `TASK_EXECUTION_CONTEXT_UNAVAILABLE` and base's text; a run the user started, a peer's
 * run, and a run whose entry agent can continue are not refused.
 */
const entry = (over: Record<string, unknown> = {}) => ({ entryAgentRunId: "eng-lead", recipientAddress: "/software_engineering_team", linkedAt: "2026-11-01T00:00:00.000Z", ...over });
const harness = (input: Readonly<{ entries?: readonly Record<string, unknown>[]; own?: Record<string, string> | null; activity?: AgentConversationActivity }>) => {
  const conversationOf = vi.fn(async (_execution: unknown, _entry: { agentRunId: string; address: string }) =>
    ({ entryAddress: "/lead", activity: input.activity ?? { kind: "present" as const } }));
  const restorability = new DelegatedRunRestorability({
    tree: () => ({ tasksOf: () => (input.entries ?? []) as never }),
    ownDelegations: { of: vi.fn(async () => (input.own ?? null) as never) },
    conversationOf,
  });
  return { restorability, conversationOf };
};
const TEAM = { rootSubjectKind: "agent_team" as const, rootRunId: "eng" };
const AGENT = { rootSubjectKind: "agent" as const, rootRunId: "research" };
const damaged: AgentConversationActivity = { kind: "indeterminate", error: new Error("line 3 is not JSON") };

describe("DelegatedRunRestorability", () => {
  it("a team run whose coordinator's conversation cannot be read: base's code and text, naming the team, the coordinator, the problem and the next step", async () => {
    const h = harness({ entries: [entry({ linkedAt: "2026-11-01T00:00:00.000Z" }), entry({ entryAgentRunId: "eng-lead-2", linkedAt: "2026-11-02T00:00:00.000Z" })], activity: damaged });
    await expect(h.restorability.refusal(TEAM)).resolves.toEqual({ accepted: false, code: "TASK_EXECUTION_CONTEXT_UNAVAILABLE",
      message: "The delegated Team at '/software_engineering_team' cannot be restored: the saved conversation of its coordinator '/lead' cannot be read (line 3 is not JSON). "
        + "Its files were left unchanged. Start a new delegation for this work, or restore its saved conversation from a backup." });
    // Its last entry's entry agent.
    expect(h.conversationOf).toHaveBeenCalledWith({ teamRunId: "eng" }, { agentRunId: "eng-lead-2", address: "/software_engineering_team" });
  });

  it("an agent run with no saved conversation: base's text for none", async () => {
    const h = harness({ entries: [entry({ entryAgentRunId: "research", recipientAddress: "/research" })], activity: { kind: "none" } });
    await expect(h.restorability.refusal(AGENT)).resolves.toMatchObject({ code: "TASK_EXECUTION_CONTEXT_UNAVAILABLE",
      message: "The delegated Agent at '/research' cannot be restored: it has no saved conversation to continue. Start a new delegation for this work." });
  });

  it("a run whose Task was deleted is checked by its own file's delegation", async () => {
    const h = harness({ own: { entryAgentRunId: "research", recipientAddress: "/research" }, activity: damaged });
    await expect(h.restorability.refusal(AGENT)).resolves.toMatchObject({ code: "TASK_EXECUTION_CONTEXT_UNAVAILABLE" });
    expect(h.conversationOf).toHaveBeenCalledWith({ agentRunId: "research" }, { agentRunId: "research", address: "/research" });
  });

  it("not refused: a run whose entry agent can continue, a run the user started, a peer's run, an Org run", async () => {
    await expect(harness({ entries: [entry()] }).restorability.refusal(TEAM)).resolves.toBeNull();
    const userStarted = harness({ activity: damaged });
    await expect(userStarted.restorability.refusal(AGENT)).resolves.toBeNull();
    expect(userStarted.conversationOf).not.toHaveBeenCalled();
    const peer = harness({ entries: [entry({ nodeId: "node-b" })], activity: damaged });
    await expect(peer.restorability.refusal(TEAM)).resolves.toBeNull();
    await expect(harness({ entries: [entry()], activity: damaged }).restorability.refusal({ rootSubjectKind: "agent_org", rootRunId: "org" })).resolves.toBeNull();
  });
});
