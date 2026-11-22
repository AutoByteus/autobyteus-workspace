import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import type { AgentRunPreface } from "../../agent-execution/domain/agent-run-input-preface.js";
import type { AgentRunPlatformNoticeSource } from "../../agent-execution/domain/agent-run-platform-notices.js";
import { TEAM_CHANGE_NOTICE_SENDER_ID } from "../../agent-execution/domain/system-task-notification-senders.js";
import type { TeamMemberRef, TeamMembershipChange } from "./team-membership-change.js";
import { ContainedTeamAddressSpace } from "../container/contained-team-address-space.js";

type Rules = readonly Readonly<{ to: string; rules: readonly string[] }>[];

/** One member's pending notice: the net change since its last delivered one (N-2). */
type Pending = {
  joined: Map<string, TeamMemberRef>;
  left: Map<string, TeamMemberRef>;
  rulesAtLastNotice: Rules;
  rules: Rules;
  /** The notice on its way and what it said: on delivery only that is settled (a change meanwhile stays pending). */
  inFlight: Readonly<{ id: string; joined: readonly string[]; left: readonly string[]; rules: Rules }> | null;
};

const nameOf = (address: string): string => address.split("/").filter(Boolean).at(-1) ?? address;
const rulesOf = (handoffs: readonly CollaborationHandoff[], from: string): Rules =>
  handoffs.filter((handoff) => handoff.from === from).map((handoff) => ({ to: handoff.to, rules: [...handoff.rules] }));

/** The notice text (design § Exact Texts): only the lines that apply. */
export const teamChangeNoticeText = (input: Readonly<{
  joined: readonly TeamMemberRef[]; left: readonly TeamMemberRef[]; rulesChanged: boolean;
}>): string => [
  "Your team changed: its definition was updated.",
  ...input.joined.map((member) => `Joined: ${nameOf(member.address)} at ${member.address}.`),
  ...input.left.map((member) => `Left: ${nameOf(member.address)} (${member.address}); messages to it are no longer delivered.`),
  input.rulesChanged ? "Your handoff rules changed; call get_handoff_rules to read them." : "Your handoff rules are unchanged.",
].join("\n");

/**
 * DEC-004, DS-006: one short notice to each member still in a team whose definition changed: who joined, who left, and
 * whether its own handoff rules changed. The notice waits for the member's next input (it rides on it, as the other
 * platform notices do); a member not started yet hears it when it starts. A member's pending notice states the net
 * change since its last delivered one: one that joined and left again before delivery, or left and came back, is not
 * named; a notice with nothing left to say is dropped. A member that joined hears nothing (it starts with the team as
 * it is now).
 */
export class TeamChangeNoticeSource implements AgentRunPlatformNoticeSource {
  private readonly pending = new Map<string, Pending>();

  /**
   * A committed change: each remaining member's notice is merged into its pending one. A Team unit's members are told the
   * joined and left members' Org addresses (its address boundary, design R-1'').
   */
  recordChange(change: TeamMembershipChange): void {
    const joinedIds = new Set(change.joined.map((member) => member.agentRunId));
    const space = ContainedTeamAddressSpace.of(change.tree.containedIn);
    const shown = (member: TeamMemberRef): TeamMemberRef => space ? Object.freeze({ ...member, address: space.toOrg(member.address) }) : member;
    for (const member of change.tree.rootTeam.members) {
      if (joinedIds.has(member.agentRunId)) continue;
      const pending = this.pending.get(member.agentRunId) ?? (() => {
        const created: Pending = { joined: new Map(), left: new Map(), rulesAtLastNotice: rulesOf(change.handoffsBefore, member.address),
          rules: [], inFlight: null };
        this.pending.set(member.agentRunId, created);
        return created;
      })();
      // Net change; a member named in the notice on its way was told, so its next move is news again.
      for (const joined of change.joined) {
        if (!pending.left.delete(joined.agentRunId) || pending.inFlight?.left.includes(joined.agentRunId)) pending.joined.set(joined.agentRunId, shown(joined));
      }
      for (const left of change.left) {
        if (!pending.joined.delete(left.agentRunId) || pending.inFlight?.joined.includes(left.agentRunId)) pending.left.set(left.agentRunId, shown(left));
      }
      pending.rules = rulesOf(change.tree.handoffs, member.address);
    }
  }

  async takePreface(run: AgentRun): Promise<AgentRunPreface | null> {
    const pending = this.pending.get(run.runId);
    if (!pending || pending.inFlight) return null;
    const rulesChanged = !isDeepStrictEqual(pending.rules, pending.rulesAtLastNotice);
    if (!pending.joined.size && !pending.left.size && !rulesChanged) {
      this.pending.delete(run.runId);
      return null;
    }
    const text = teamChangeNoticeText({ joined: [...pending.joined.values()], left: [...pending.left.values()], rulesChanged });
    const id = randomUUID();
    pending.inFlight = Object.freeze({ id, joined: [...pending.joined.keys()], left: [...pending.left.keys()], rules: pending.rules });
    return Object.freeze({ id, text, presentation: Object.freeze({ senderId: TEAM_CHANGE_NOTICE_SENDER_ID, content: text }) });
  }

  prefaceDelivered(run: AgentRun, preface: AgentRunPreface): void {
    const pending = this.pending.get(run.runId);
    const sent = pending?.inFlight;
    if (!pending || sent?.id !== preface.id) return;
    for (const agentRunId of sent.joined) pending.joined.delete(agentRunId);
    for (const agentRunId of sent.left) pending.left.delete(agentRunId);
    pending.rulesAtLastNotice = sent.rules;
    pending.inFlight = null;
    if (!pending.joined.size && !pending.left.size && isDeepStrictEqual(pending.rules, pending.rulesAtLastNotice)) this.pending.delete(run.runId);
  }

  prefaceReturned(run: AgentRun, preface: AgentRunPreface): void {
    const pending = this.pending.get(run.runId);
    if (pending?.inFlight?.id === preface.id) pending.inFlight = null;
  }

  /** A member's pending notice outlives its runtime: it is told at its next start. */
  runPublished(): void {}
  runReleased(): void {}
}
