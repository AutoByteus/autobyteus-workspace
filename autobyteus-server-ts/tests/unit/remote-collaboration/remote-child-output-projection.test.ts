import { describe, expect, it, vi } from "vitest";
import type { AgentPresentationMessage } from "@autobyteus/agent-presentation-contracts";
import { projectAgentCollaborationEvent } from "../../../src/services/agent-streaming/agent-collaboration-view-projector.js";
import { projectAgentOrgExecutionEvent } from "../../../src/services/agent-streaming/agent-org-execution-view-projector.js";
import { projectTeamRemoteEvent } from "../../../src/services/agent-streaming/team-remote-event-projector.js";
import type { RemoteRunRootEvent } from "../../../src/agent-collaboration/execution/remote/remote-run-observation.js";
import { DelegatedTeamIdleShutdown } from "../../../src/agent-team-execution/services/delegated-team-idle-shutdown.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../../src/agent-team-execution/domain/team-run-event.js";
import { createCollaborationMemberExecutionIdentity, createTeamRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";

/** autobyteus-278 N-402: a remote child's output becomes `agent_presentation` in the root projectors and nowhere else. */

const running = { type: "AGENT_STATUS", payload: { status: "running", trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null } } as AgentPresentationMessage;
const frame: RemoteRunRootEvent = { kind: "remote_agent_presentation", nodeId: "srv_docker", agentRunId: "lead-run", memberAddress: "/marketing/lead", message: running };
const summary: RemoteRunRootEvent = { kind: "remote_task_execution_summary", summary: { nodeId: "srv_docker", runId: "researcher-run", reachable: false, title: null, statuses: [], launches: [] } };

describe("remote children in the root streams", () => {
  it("the Agent and Org projectors present a remote frame as the stream's agent_presentation at the stored address", () => {
    const agent = projectAgentCollaborationEvent("manager-run", { event: frame, changeSequence: 9 });
    expect(agent).toEqual({ root_subject_kind: "agent", root_run_id: "manager-run", change_sequence: 9,
      event: { kind: "agent_presentation", member_address: "/marketing/lead", agent_run_id: "lead-run", message: running } });
    const org = projectAgentOrgExecutionEvent("org-run", { event: summary, changeSequence: 10 });
    expect(org).toEqual({ root_subject_kind: "agent_org", root_run_id: "org-run", change_sequence: 10,
      event: { kind: "remote_task_execution_summary", node_id: "srv_docker", run_id: "researcher-run", reachable: false, title: null, statuses: [], launches: [] } });
  });

  it("the Team projector presents it as the Team stream's agent message; a member input names its recipient; usage is not this Team's", () => {
    expect(projectTeamRemoteEvent(frame, 4)).toEqual({ type: "AGENT_STATUS", payload: { ...running.payload, change_sequence: 4, agent_run_id: "lead-run" } });
    const input = { type: "MEMBER_INPUT_MESSAGE", payload: { message_id: "m1", dedupe_key: "d1", content: "status?", input_origin: "user_message",
      received_at: "2026-10-23T08:00:00.000Z", context_file_paths: [], sender_agent_run_id: null, parent_communication_message_id: null } } as AgentPresentationMessage;
    expect(projectTeamRemoteEvent({ ...frame, message: input } as RemoteRunRootEvent, 5)).toEqual({ type: "MEMBER_INPUT_MESSAGE",
      payload: { change_sequence: 5, recipient_agent_run_id: "lead-run", ...input.payload } });
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
