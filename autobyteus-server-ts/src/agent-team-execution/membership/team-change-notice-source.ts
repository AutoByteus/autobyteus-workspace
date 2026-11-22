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

/** One kind of a member's rules since its last notice: its Team's own, or the Org's from its Org address (design R-6). */
type RulePart = { atLastNotice: Rules; now: Rules };

/** One member's pending notice: the net change since its last delivered one (N-2). */
type Pending = {
  joined: Map<string, TeamMemberRef>;
  left: Map<string, TeamMemberRef>;
  /** `null`: unchanged since its last notice. */
  team: RulePart | null;
  org: RulePart | null;
  /** The notice on its way and what it said: on delivery only that is settled (a change meanwhile stays pending). */
  inFlight: Readonly<{ id: string; joined: readonly string[]; left: readonly string[]; team: Rules | null; org: Rules | null }> | null;
};

/** What an agent's Org rules were and are, for one change (an Org's rules follow its units' membership, REQ-004). */
export type OrgRuleChange = Readonly<{ agentRunId: string; before: readonly CollaborationHandoff[]; after: readonly CollaborationHandoff[] }>;

/** The Org rule changes a contained Team's membership change causes (the Org container directory answers them). */
export type OrgRuleChanges = Readonly<{
  orgRuleChangesFor(change: Readonly<{ tree: TeamMembershipChange["tree"]; joined: readonly TeamMemberRef[]; left: readonly TeamMemberRef[] }>): readonly OrgRuleChange[];
}>;

const changed = (part: RulePart | null): boolean => part !== null && !isDeepStrictEqual(part.atLastNotice, part.now);
const handoffRules = (handoffs: readonly CollaborationHandoff[]): Rules => handoffs.map((handoff) => ({ to: handoff.to, rules: [...handoff.rules] }));

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
  private orgRules: OrgRuleChanges | null = null;

  /** The composition root binds the Org containers (created after the notice sources): a contained Team's change reaches its Org's rules. */
  bindOrgRules(orgRules: OrgRuleChanges): void { this.orgRules = orgRules; }

  private pendingOf(agentRunId: string): Pending {
    const existing = this.pending.get(agentRunId);
    if (existing) return existing;
    const created: Pending = { joined: new Map(), left: new Map(), team: null, org: null, inFlight: null };
    this.pending.set(agentRunId, created);
    return created;
  }

  /** Net change: a party named in the notice on its way was told, so its next move is news again. */
  private merge(pending: Pending, joined: readonly TeamMemberRef[], left: readonly TeamMemberRef[], shown: (member: TeamMemberRef) => TeamMemberRef): void {
    for (const party of joined) {
      if (!pending.left.delete(party.agentRunId) || pending.inFlight?.left.includes(party.agentRunId)) pending.joined.set(party.agentRunId, shown(party));
    }
    for (const party of left) {
      if (!pending.joined.delete(party.agentRunId) || pending.inFlight?.joined.includes(party.agentRunId)) pending.left.set(party.agentRunId, shown(party));
    }
  }

  private recordOrgRules(pending: Pending, before: readonly CollaborationHandoff[], after: readonly CollaborationHandoff[]): void {
    pending.org ??= { atLastNotice: handoffRules(before), now: [] };
    pending.org.now = handoffRules(after);
  }

  /**
   * An Org's change (REQ-009, design DS-006): each recipient (an agent of a unit still in the Org) hears which units joined
   * and left (at their Org addresses; a Team unit's line names the Team) and, merged into its pending notice, whether its
   * Org rules changed (one net notice, R-6).
   */
  recordOrgChange(input: Readonly<{
    recipients: readonly Readonly<{ agentRunId: string; rulesBefore: readonly CollaborationHandoff[]; rulesAfter: readonly CollaborationHandoff[] }>[];
    joined: readonly TeamMemberRef[];
    left: readonly TeamMemberRef[];
  }>): void {
    for (const recipient of input.recipients) {
      const pending = this.pendingOf(recipient.agentRunId);
      this.merge(pending, input.joined, input.left, (party) => party);
      if (!isDeepStrictEqual(handoffRules(recipient.rulesBefore), handoffRules(recipient.rulesAfter)) || pending.org) {
        this.recordOrgRules(pending, recipient.rulesBefore, recipient.rulesAfter);
      }
    }
  }

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
      const pending = this.pendingOf(member.agentRunId);
      this.merge(pending, change.joined, change.left, shown);
      pending.team ??= { atLastNotice: rulesOf(change.handoffsBefore, member.address), now: [] };
      pending.team.now = rulesOf(change.tree.handoffs, member.address);
    }
    // REQ-004: an Org rule to a member that left (or came back) changed its sender's rules, in any unit of the Org.
    if (change.tree.containedIn) {
      for (const orgChange of this.orgRules?.orgRuleChangesFor(change) ?? []) this.recordOrgRules(this.pendingOf(orgChange.agentRunId), orgChange.before, orgChange.after);
    }
  }

  async takePreface(run: AgentRun): Promise<AgentRunPreface | null> {
    const pending = this.pending.get(run.runId);
    if (!pending || pending.inFlight) return null;
    const rulesChanged = changed(pending.team) || changed(pending.org);
    if (!pending.joined.size && !pending.left.size && !rulesChanged) {
      this.pending.delete(run.runId);
      return null;
    }
    const text = teamChangeNoticeText({ joined: [...pending.joined.values()], left: [...pending.left.values()], rulesChanged });
    const id = randomUUID();
    pending.inFlight = Object.freeze({ id, joined: [...pending.joined.keys()], left: [...pending.left.keys()],
      team: pending.team ? pending.team.now : null, org: pending.org ? pending.org.now : null });
    return Object.freeze({ id, text, presentation: Object.freeze({ senderId: TEAM_CHANGE_NOTICE_SENDER_ID, content: text }) });
  }

  prefaceDelivered(run: AgentRun, preface: AgentRunPreface): void {
    const pending = this.pending.get(run.runId);
    const sent = pending?.inFlight;
    if (!pending || sent?.id !== preface.id) return;
    for (const agentRunId of sent.joined) pending.joined.delete(agentRunId);
    for (const agentRunId of sent.left) pending.left.delete(agentRunId);
    if (pending.team && sent.team) pending.team.atLastNotice = sent.team;
    if (pending.org && sent.org) pending.org.atLastNotice = sent.org;
    pending.inFlight = null;
    if (!pending.joined.size && !pending.left.size && !changed(pending.team) && !changed(pending.org)) this.pending.delete(run.runId);
  }

  prefaceReturned(run: AgentRun, preface: AgentRunPreface): void {
    const pending = this.pending.get(run.runId);
    if (pending?.inFlight?.id === preface.id) pending.inFlight = null;
  }

  /** A member's pending notice outlives its runtime: it is told at its next start. */
  runPublished(): void {}
  runReleased(): void {}
}
