import { describe, expect, it, vi } from "vitest";
import { DelegatedTeamIdleShutdown } from "../../../src/agent-team-execution/services/delegated-team-idle-shutdown.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../../src/agent-team-execution/domain/team-run-event.js";
import { createCollaborationMemberExecutionIdentity, createTeamRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";

/**
 * autobyteus-461 SR-083, SR-084, SR-086 G-D1: a peer run's output, summary and status are its own (its output through
 * `/ws/peer-run`), never frames of its delegator's view, and never reach its delegator's root.
 */

describe("a peer run in a delegator's view", () => {
  it("the Team root's idle shutdown follows its own agents' status (a peer run's frames never reach the root: SR-066)", () => {
    const timers = { setTimeout: vi.fn(() => "timer"), clearTimeout: vi.fn() };
    const idle = new DelegatedTeamIdleShutdown({ teamRunId: "team-run", shutDownIfQuiet: async () => false, gracePeriodMs: () => 1000, timers });
    expect(timers.setTimeout).toHaveBeenCalledTimes(1);
    const local: TeamRunEvent = { eventSourceType: TeamRunEventSourceType.AGENT,
      execution: createCollaborationMemberExecutionIdentity({ root: createTeamRootExecutionIdentity("team-run"), memberAddress: "/lead" as never, agentRunId: "lead" }),
      payload: { eventType: "AGENT_STATUS", details: { status: "running", trigger: null, toolName: null, errorMessage: null, errorDetails: null, recoverableBlock: null }, statusHint: "ACTIVE" } } as never;
    idle.onRootEvent(local);
    expect(timers.clearTimeout).toHaveBeenCalledTimes(1);
    idle.dispose();
  });
});
