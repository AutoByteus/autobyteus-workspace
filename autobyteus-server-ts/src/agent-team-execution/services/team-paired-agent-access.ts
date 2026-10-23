import type { AgentPresentationMessage } from "@autobyteus/agent-presentation-contracts";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { AgentPresentationEvent } from "../../agent-collaboration/execution/events/agent-presentation-event.js";
import { projectAgentPresentationMessage } from "../../agent-collaboration/execution/events/agent-presentation-message-projector.js";
import {
  notLiveRefusal,
  remoteOwnerUserMessage,
  type PairedAgentAccess,
  type PairedAgentObservation,
  type PairedAgentPresentationListener,
  type PairedAgentStatus,
  type RemoteOwner,
} from "../../agent-collaboration/execution/remote/paired-agent-access.js";
import type { RemoteOwnerCommand } from "../../agent-collaboration/execution/remote/remote-run-channel.js";
import type { RootTeamRun } from "../domain/root-team-run.js";
import type { TeamAgentEvent } from "../domain/team-agent-event.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../domain/team-run-event.js";
import type { TeamRunLifecycleListener, TeamRunLifecycleUnsubscribe } from "../domain/team-run-lifecycle.js";
import { peerStartedTeamMembers } from "../domain/team-run-remote-links.js";

type TeamRuns = Readonly<{
  getManagedTeamRun(teamRunId: string): RootTeamRun | null;
  resolveManagedTeamRun(teamRunId: string): Promise<RootTeamRun | null>;
  subscribeToLifecycle(teamRunId: string, listener: TeamRunLifecycleListener): TeamRunLifecycleUnsubscribe;
  terminateTeamRun(teamRunId: string): Promise<boolean>;
}>;

/** A Team member's presentation event, as every root kind presents it (the Team stream adds its root to usage summaries). */
const presentationEventOf = (event: TeamAgentEvent): AgentPresentationEvent => {
  if (event.eventType !== "TOKEN_USAGE_UPDATED" || !event.details.runSummaryAfterEvent) return event as AgentPresentationEvent;
  const { root_team_run_id: _root, ...summary } = event.details.runSummaryAfterEvent;
  return { ...event, details: { ...event.details, runSummaryAfterEvent: summary } } as AgentPresentationEvent;
};

/** One root event as a member's presentation message, or `null` for events that are not a member's output. */
export const teamMemberPresentationOf = (event: TeamRunEvent): Readonly<{ agentRunId: string; message: AgentPresentationMessage }> | null => {
  if (event.eventSourceType === TeamRunEventSourceType.AGENT) {
    return { agentRunId: event.execution.agentRunId, message: projectAgentPresentationMessage(presentationEventOf(event.payload)) };
  }
  if (event.eventSourceType !== TeamRunEventSourceType.MEMBER_INPUT) return null;
  const { recipientAgentRunId, ...details } = event.payload;
  return {
    agentRunId: recipientAgentRunId,
    message: projectAgentPresentationMessage({ eventType: "MEMBER_INPUT_MESSAGE", details, statusHint: null }),
  };
};

/**
 * autobyteus-278 (AR-401): a remote Team, as its node serves the peer's owner. Its own agents are the root's members:
 * their output is on the root publisher, filtered to the members (a copy a member delegated on this node is not
 * sent). A quiet idle shutdown unregisters the root and a restore creates a new one, so the observation follows
 * the root through the manager's lifecycle notifications (published at the directory's commit and unregister). A
 * stop of any kind (the lifecycle's `ending: "stopped"`) ends the observation.
 */
export class TeamPairedAgentAccess implements PairedAgentAccess {
  constructor(private readonly teamRuns: TeamRuns) {}

  async observePairedAgents(teamRunId: string, onPresentation: PairedAgentPresentationListener, onEnded: () => void): Promise<PairedAgentObservation> {
    let unsubscribe: (() => void) | null = null;
    let closed = false;
    const attach = (root: RootTeamRun | null): void => {
      unsubscribe?.();
      unsubscribe = null;
      if (closed || !root) return;
      const members = new Set(peerStartedTeamMembers(root.getExecutionTreeSnapshot()).map((member) => member.agentRunId));
      unsubscribe = root.subscribeToEvents(({ event }) => {
        try {
          const frame = teamMemberPresentationOf(event);
          if (frame && members.has(frame.agentRunId)) onPresentation(frame.agentRunId, frame.message);
        } catch (error) {
          console.warn(`Team run '${teamRunId}': an event was not sent to the peer that started it: ${String(error)}`);
        }
      });
    };
    const close = (): void => {
      if (closed) return;
      closed = true;
      offLifecycle();
      unsubscribe?.();
      unsubscribe = null;
    };
    attach(this.teamRuns.getManagedTeamRun(teamRunId));
    // A restore after idle shutdown is a new root: follow it. A stop ends the observation (DS-006).
    const offLifecycle = this.teamRuns.subscribeToLifecycle(teamRunId, (snapshot) => {
      if (snapshot.ending === "stopped") { close(); onEnded(); return; }
      attach(snapshot.isActive ? this.teamRuns.getManagedTeamRun(teamRunId) : null);
    });
    return Object.freeze({ close });
  }

  async executeOwnerCommand(teamRunId: string, agentRunId: string, command: RemoteOwnerCommand, owner: RemoteOwner): Promise<AgentOperationResult> {
    if (command.kind === "terminate") {
      return await this.teamRuns.terminateTeamRun(teamRunId)
        ? { accepted: true }
        : { accepted: false, code: "TEAM_RUN_STOP_REJECTED", message: `Team run '${teamRunId}' did not stop.` };
    }
    if (command.kind === "interrupt") {
      const root = this.teamRuns.getManagedTeamRun(teamRunId);
      return root ? root.executeAgentCommand(agentRunId, { kind: "interrupt" }) : notLiveRefusal(agentRunId);
    }
    // A message restores a Team that went quiet and wakes the member, as any input does.
    const root = await this.teamRuns.resolveManagedTeamRun(teamRunId);
    if (!root) return { accepted: false, code: "RUN_NOT_FOUND", message: `Team run '${teamRunId}' was not found.` };
    return root.executeAgentCommand(agentRunId, { kind: "post_message", message: remoteOwnerUserMessage(command, owner) });
  }

  pairedAgentStatuses(teamRunId: string): readonly PairedAgentStatus[] {
    const root = this.teamRuns.getManagedTeamRun(teamRunId);
    if (!root?.isActive()) return [];
    const members = new Set(peerStartedTeamMembers(root.getExecutionTreeSnapshot()).map((member) => member.agentRunId));
    return root.getLeafAgentStatusSnapshots()
      .filter((snapshot) => members.has(snapshot.execution.agentRunId))
      .map((snapshot) => ({ agentRunId: snapshot.execution.agentRunId, status: snapshot.details.status }));
  }
}
