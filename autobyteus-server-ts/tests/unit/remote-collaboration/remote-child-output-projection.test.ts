import { describe, expect, it, vi } from "vitest";
import type { AgentPresentationMessage } from "@autobyteus/agent-presentation-contracts";
import { projectAgentCollaborationEvent } from "../../../src/services/agent-streaming/agent-collaboration-view-projector.js";
import { projectAgentOrgExecutionEvent } from "../../../src/services/agent-streaming/agent-org-execution-view-projector.js";
import { projectTeamRemoteEvent } from "../../../src/services/agent-streaming/team-remote-event-projector.js";
import type { RemoteRunRootEvent } from "../../../src/agent-collaboration/execution/remote/remote-run-observation.js";
import { DelegatedTeamIdleShutdown } from "../../../src/agent-team-execution/services/delegated-team-idle-shutdown.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../../src/agent-team-execution/domain/team-run-event.js";
import { createCollaborationMemberExecutionIdentity, createTeamRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";

/**
 * autobyteus-278 N-402, autobyteus-461 SR-083, SR-084, CR-461-091: a peer child's output becomes `agent_presentation` in
 * the root projectors and nowhere else; a peer row's summary and status are its run's own, read by its run ID, not relayed.
 */

const content = { type: "SEGMENT_CONTENT", payload: { segment_id: "s1", turn_id: "t1", segment_type: "text", delta: "Drafting the brief." } } as AgentPresentationMessage;
const frame: RemoteRunRootEvent = { kind: "remote_agent_presentation", nodeId: "srv_docker", agentRunId: "lead-run", memberAddress: "/marketing/lead", message: content };

describe("remote children in the root streams", () => {
  it("CR-461-091: the Agent and Org projectors present a peer child's output as the stream's agent_presentation at the stored address", () => {
    expect(projectAgentCollaborationEvent("manager-run", { event: frame, changeSequence: 9 })).toEqual({ root_subject_kind: "agent", root_run_id: "manager-run", change_sequence: 9,
      event: { kind: "agent_presentation", member_address: "/marketing/lead", agent_run_id: "lead-run", message: content } });
    expect(projectAgentOrgExecutionEvent("org-run", { event: frame, changeSequence: 10 })).toEqual({ root_subject_kind: "agent_org", root_run_id: "org-run", change_sequence: 10,
      event: { kind: "agent_presentation", member_address: "/marketing/lead", agent_run_id: "lead-run", message: content } });
  });

  it("CR-461-091: the Team projector presents it as the Team stream's agent message; a member input names its recipient", () => {
    expect(projectTeamRemoteEvent(frame, 4)).toEqual({ type: "SEGMENT_CONTENT", payload: { ...content.payload, change_sequence: 4, agent_run_id: "lead-run" } });
    const input = { type: "MEMBER_INPUT_MESSAGE", payload: { message_id: "m1", dedupe_key: "d1", content: "status?", input_origin: "user_message",
      received_at: "2026-10-23T08:00:00.000Z", context_file_paths: [], sender_agent_run_id: null, parent_communication_message_id: null } } as AgentPresentationMessage;
    expect(projectTeamRemoteEvent({ ...frame, message: input } as RemoteRunRootEvent, 5)).toEqual({ type: "MEMBER_INPUT_MESSAGE",
      payload: { change_sequence: 5, recipient_agent_run_id: "lead-run", ...input.payload } });
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
