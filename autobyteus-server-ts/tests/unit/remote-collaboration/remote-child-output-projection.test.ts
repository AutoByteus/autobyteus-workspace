import { describe, expect, it, vi } from "vitest";
import { projectAgentCollaborationEvent } from "../../../src/services/agent-streaming/agent-collaboration-view-projector.js";
import { projectAgentOrgExecutionEvent } from "../../../src/services/agent-streaming/agent-org-execution-view-projector.js";
import { projectTeamRemoteEvent } from "../../../src/services/agent-streaming/team-remote-event-projector.js";
import type { RemoteRunRootEvent } from "../../../src/agent-collaboration/execution/remote/remote-run-observation.js";
import { DelegatedTeamIdleShutdown } from "../../../src/agent-team-execution/services/delegated-team-idle-shutdown.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../../src/agent-team-execution/domain/team-run-event.js";
import { createCollaborationMemberExecutionIdentity, createTeamRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";

/** autobyteus-278, autobyteus-461 SR-083: a peer row's summary in each view; its status is read by its run ID, not relayed. */

const summary: RemoteRunRootEvent = { kind: "remote_task_execution_summary", summary: { nodeId: "srv_docker", runId: "researcher-run", reachable: false, title: null, statuses: [], launches: [] } };

describe("remote children in the root streams", () => {
  it("a peer row's summary is each view's remote_task_execution_summary; its status is its own run's (SR-083), never a view frame", () => {
    const agent = projectAgentCollaborationEvent("manager-run", { event: summary, changeSequence: 9 });
    expect(agent).toEqual({ root_subject_kind: "agent", root_run_id: "manager-run", change_sequence: 9,
      event: { kind: "remote_task_execution_summary", node_id: "srv_docker", run_id: "researcher-run", reachable: false, title: null, statuses: [], launches: [] } });
    const org = projectAgentOrgExecutionEvent("org-run", { event: summary, changeSequence: 10 });
    expect(org).toEqual({ root_subject_kind: "agent_org", root_run_id: "org-run", change_sequence: 10,
      event: { kind: "remote_task_execution_summary", node_id: "srv_docker", run_id: "researcher-run", reachable: false, title: null, statuses: [], launches: [] } });
    expect(projectTeamRemoteEvent(summary, 6)).toEqual({ type: "REMOTE_TASK_EXECUTION_SUMMARY", payload: {
      change_sequence: 6, node_id: "srv_docker", run_id: "researcher-run", reachable: false, title: null, statuses: [], launches: [] } });
  });

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
